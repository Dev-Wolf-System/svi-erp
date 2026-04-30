-- ============================================================================
-- 0021 — Agenda (F7) — multi-recurso con disponibilidad recurrente,
--                       bloqueos puntuales y turnos sin overlapping
-- ============================================================================
-- Decisiones (ver docs/AGENTE_IA_AGENDA.md §6):
--   - Multi-recurso desde día 1: owner / asesor de inversiones / vendedor / sala.
--   - Disponibilidad recurring por día_semana + slot_minutos parametrizable.
--   - Anti-overlapping garantizado por EXCLUDE USING gist sobre tstzrange.
--   - pg_notify('svi_agenda', ...) en INSERT/UPDATE de turnos para que N8N
--     mande confirmaciones / recordatorios / sync Google Calendar (F7.5).
--   - RLS estándar por empresa_id (mismo patrón que el resto del schema).
-- ============================================================================

-- Extensión necesaria para EXCLUDE constraints con uuid + range
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE agenda_recurso_tipo AS ENUM ('owner', 'asesor', 'vendedor', 'sala');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agenda_turno_estado AS ENUM (
    'solicitado',   -- pedido por inversor/cliente, esperando confirmación admin
    'confirmado',   -- admin lo confirmó, vigente
    'cumplido',     -- ya ocurrió y se atendió
    'cancelado',    -- cancelado por cliente o admin
    'no_show'       -- el cliente no asistió
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agenda_turno_modalidad AS ENUM ('presencial', 'videollamada', 'telefono');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agenda_persona_tipo AS ENUM ('cliente', 'inversor', 'lead', 'externo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- agenda_recursos — quién o qué tiene agenda
-- ============================================
CREATE TABLE IF NOT EXISTS agenda_recursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id     UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
  tipo            agenda_recurso_tipo NOT NULL,
  nombre          TEXT NOT NULL,
  -- Si tipo es owner/asesor/vendedor, vinculamos al usuario interno
  -- (para el agente IA → este usuario es el dueño de los turnos).
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Color HEX para pintar los turnos en el calendario (default svi-gold).
  color           VARCHAR(7) NOT NULL DEFAULT '#C5A059',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agenda_recursos_empresa
  ON agenda_recursos(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_recursos_usuario
  ON agenda_recursos(usuario_id) WHERE deleted_at IS NULL;

-- ============================================
-- agenda_disponibilidad — franjas semanales recurrentes
-- ============================================
CREATE TABLE IF NOT EXISTS agenda_disponibilidad (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id      UUID NOT NULL REFERENCES agenda_recursos(id) ON DELETE CASCADE,
  -- 0 = domingo ... 6 = sábado (compatible con JS getDay())
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL CHECK (hora_fin > hora_inicio),
  slot_minutos    SMALLINT NOT NULL DEFAULT 30
                  CHECK (slot_minutos IN (15, 20, 30, 45, 60, 90, 120)),
  -- Vigencia opcional para schedule changes futuros (vacaciones, temporadas).
  vigente_desde   DATE,
  vigente_hasta   DATE CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_dispo_recurso_dia
  ON agenda_disponibilidad(recurso_id, dia_semana);

-- ============================================
-- agenda_bloqueos — excepciones puntuales (vacaciones, feriados, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS agenda_bloqueos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id      UUID NOT NULL REFERENCES agenda_recursos(id) ON DELETE CASCADE,
  desde           TIMESTAMPTZ NOT NULL,
  hasta           TIMESTAMPTZ NOT NULL CHECK (hasta > desde),
  motivo          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_bloqueos_recurso_rango
  ON agenda_bloqueos(recurso_id, desde, hasta);

-- ============================================
-- agenda_turnos — instancias concretas
-- ============================================
CREATE TABLE IF NOT EXISTS agenda_turnos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  recurso_id         UUID NOT NULL REFERENCES agenda_recursos(id) ON DELETE RESTRICT,
  -- Persona del turno: cliente, inversor, lead (con id) o externo (sin id)
  persona_tipo       agenda_persona_tipo NOT NULL,
  persona_id         UUID,                      -- null si tipo='externo' o lead sin id
  externo_nombre     TEXT,                       -- para 'externo' o lead sin registrar
  externo_telefono   VARCHAR(20),                -- contacto del externo
  inicio             TIMESTAMPTZ NOT NULL,
  fin                TIMESTAMPTZ NOT NULL CHECK (fin > inicio),
  estado             agenda_turno_estado NOT NULL DEFAULT 'solicitado',
  modalidad          agenda_turno_modalidad NOT NULL DEFAULT 'presencial',
  motivo             TEXT NOT NULL,
  notas              TEXT,
  -- Quién creó el turno: usuario:<id> | agente_wa | web | sistema
  creado_por         TEXT NOT NULL,
  -- Idempotencia para creación desde el agente IA (F8) — UNIQUE opcional
  external_ref       TEXT UNIQUE,
  -- Audit de cancelación
  cancelado_motivo   TEXT,
  cancelado_at       TIMESTAMPTZ,
  cancelado_por      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint anti-overlapping en el mismo recurso para turnos vivos.
  -- '[)' significa lower-bound inclusive, upper-bound exclusive (estándar).
  CONSTRAINT no_overlap_turnos_vivos
    EXCLUDE USING gist (
      recurso_id WITH =,
      tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (estado IN ('solicitado', 'confirmado'))
);

CREATE INDEX IF NOT EXISTS idx_turnos_recurso_inicio
  ON agenda_turnos(recurso_id, inicio)
  WHERE estado IN ('solicitado', 'confirmado');
CREATE INDEX IF NOT EXISTS idx_turnos_persona
  ON agenda_turnos(persona_tipo, persona_id)
  WHERE persona_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turnos_empresa_inicio
  ON agenda_turnos(empresa_id, inicio);

-- ============================================
-- Trigger: pg_notify a 'svi_agenda' en cambios de turnos
-- (consume N8N para confirmaciones / recordatorios / sync Google Calendar F7.5)
-- ============================================
CREATE OR REPLACE FUNCTION trg_agenda_turno_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'svi_agenda',
    json_build_object(
      'op',           TG_OP,
      'turno_id',     COALESCE(NEW.id, OLD.id),
      'empresa_id',   COALESCE(NEW.empresa_id, OLD.empresa_id),
      'recurso_id',   COALESCE(NEW.recurso_id, OLD.recurso_id),
      'estado',       COALESCE(NEW.estado, OLD.estado),
      'inicio',       COALESCE(NEW.inicio, OLD.inicio),
      'fin',          COALESCE(NEW.fin, OLD.fin),
      'persona_tipo', COALESCE(NEW.persona_tipo, OLD.persona_tipo),
      'persona_id',   COALESCE(NEW.persona_id, OLD.persona_id),
      'changed_at',   NOW()
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_agenda_turno_notify ON agenda_turnos;
CREATE TRIGGER trg_agenda_turno_notify
  AFTER INSERT OR UPDATE OF estado, inicio, fin, modalidad
  ON agenda_turnos
  FOR EACH ROW
  EXECUTE FUNCTION trg_agenda_turno_notify();

-- ============================================
-- Trigger: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION trg_agenda_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agenda_recursos_updated ON agenda_recursos;
CREATE TRIGGER trg_agenda_recursos_updated
  BEFORE UPDATE ON agenda_recursos
  FOR EACH ROW EXECUTE FUNCTION trg_agenda_set_updated_at();

DROP TRIGGER IF EXISTS trg_agenda_turnos_updated ON agenda_turnos;
CREATE TRIGGER trg_agenda_turnos_updated
  BEFORE UPDATE ON agenda_turnos
  FOR EACH ROW EXECUTE FUNCTION trg_agenda_set_updated_at();

-- ============================================
-- RLS — mismo patrón que el resto del schema
-- ============================================
ALTER TABLE agenda_recursos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_bloqueos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_turnos         ENABLE ROW LEVEL SECURITY;

-- recursos: SELECT/INSERT/UPDATE/DELETE solo dentro de la empresa del JWT
CREATE POLICY "agenda_recursos_select_empresa"
  ON agenda_recursos FOR SELECT
  USING (empresa_id = auth.empresa_id());

CREATE POLICY "agenda_recursos_modify_empresa"
  ON agenda_recursos FOR ALL
  USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());

-- disponibilidad y bloqueos: heredan vía recurso_id (sub-select)
CREATE POLICY "agenda_disponibilidad_empresa"
  ON agenda_disponibilidad FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agenda_recursos r
      WHERE r.id = agenda_disponibilidad.recurso_id
        AND r.empresa_id = auth.empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_recursos r
      WHERE r.id = agenda_disponibilidad.recurso_id
        AND r.empresa_id = auth.empresa_id()
    )
  );

CREATE POLICY "agenda_bloqueos_empresa"
  ON agenda_bloqueos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agenda_recursos r
      WHERE r.id = agenda_bloqueos.recurso_id
        AND r.empresa_id = auth.empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_recursos r
      WHERE r.id = agenda_bloqueos.recurso_id
        AND r.empresa_id = auth.empresa_id()
    )
  );

-- turnos: misma empresa
CREATE POLICY "agenda_turnos_empresa"
  ON agenda_turnos FOR ALL
  USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());

-- ============================================
-- Comentarios documentales
-- ============================================
COMMENT ON TABLE  agenda_recursos       IS 'F7 — Recursos con agenda propia (owner, asesor, vendedor, sala).';
COMMENT ON TABLE  agenda_disponibilidad IS 'F7 — Franjas semanales recurrentes por recurso.';
COMMENT ON TABLE  agenda_bloqueos       IS 'F7 — Excepciones puntuales (vacaciones, feriados).';
COMMENT ON TABLE  agenda_turnos         IS 'F7 — Turnos concretos. EXCLUDE constraint impide overlapping en estados solicitado/confirmado.';
COMMENT ON COLUMN agenda_turnos.creado_por  IS 'Origen: usuario:<id> | agente_wa | web | sistema';
COMMENT ON COLUMN agenda_turnos.external_ref IS 'Idempotencia para creación desde agente IA (F8).';
