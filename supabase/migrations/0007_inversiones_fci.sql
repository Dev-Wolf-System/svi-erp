-- ============================================================================
-- 0007 — Módulo FCI: inversores, inversiones, liquidaciones, historial de tasas
-- ============================================================================
-- Diseño "flex-first" (ver §13.3 del plan):
-- - config JSONB extensible
-- - tipo_instrumento + estado_regulatorio para absorber dictamen futuro
-- - Snapshots inmutables en liquidaciones
-- - Cifrado pgsodium en datos bancarios sensibles
-- ============================================================================

CREATE TABLE inversores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  cliente_id      UUID REFERENCES clientes(id),

  nombre          VARCHAR(200) NOT NULL,
  dni             VARCHAR(15),
  cuit            VARCHAR(13),
  email           VARCHAR(100),
  telefono        VARCHAR(20),

  -- Datos bancarios — los cifra el adapter en código (pgsodium se aplica vía VIEW si se requiere)
  cbu             VARCHAR(22),
  alias           VARCHAR(30),
  banco_nombre    VARCHAR(100),

  -- Bolsa extensible para clasificación CNV futura, declaraciones juradas, etc.
  config          JSONB NOT NULL DEFAULT '{}',

  portal_activo   BOOLEAN NOT NULL DEFAULT FALSE,
  portal_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_inversores_empresa ON inversores(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inversores_cliente ON inversores(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inversores_portal ON inversores(portal_user_id) WHERE portal_activo = TRUE;

-- ============================================
-- INVERSIONES — registro principal
-- ============================================
CREATE TABLE inversiones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  inversor_id         UUID NOT NULL REFERENCES inversores(id) ON DELETE RESTRICT,
  sucursal_id         UUID REFERENCES sucursales(id),

  -- Numeración generada con SEQUENCE atómica vía generar_numero_operacion()
  numero_contrato     VARCHAR(30) NOT NULL UNIQUE,

  capital_inicial     DECIMAL(15,2) NOT NULL CHECK (capital_inicial > 0),
  capital_actual      DECIMAL(15,2) NOT NULL,
  moneda              CHAR(3) NOT NULL DEFAULT 'ARS',
  tasa_mensual        DECIMAL(5,2) NOT NULL CHECK (tasa_mensual >= 0),

  fecha_inicio        DATE NOT NULL,
  fecha_vencimiento   DATE,

  estado              estado_inversion NOT NULL DEFAULT 'activa',

  -- Discriminadores para flexibilidad legal post-dictamen
  tipo_instrumento    tipo_instrumento NOT NULL DEFAULT 'mutuo',
  estado_regulatorio  estado_regulatorio NOT NULL DEFAULT 'pre_dictamen',
  firma_metodo        VARCHAR(30) NOT NULL DEFAULT 'presencial',

  -- Configuración extensible (plazo_minimo_dias, prospecto_url, clausula_penal_pct, etc.)
  config              JSONB NOT NULL DEFAULT '{}',

  contrato_url        TEXT,
  observaciones       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_inversiones_inversor ON inversiones(inversor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inversiones_estado ON inversiones(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_inversiones_empresa ON inversiones(empresa_id) WHERE deleted_at IS NULL;

-- ============================================
-- HISTORIAL DE TASAS — nunca perdemos el rastro
-- ============================================
CREATE TABLE inversion_tasa_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  inversion_id    UUID NOT NULL REFERENCES inversiones(id) ON DELETE CASCADE,
  tasa_anterior   DECIMAL(5,2),
  tasa_nueva      DECIMAL(5,2) NOT NULL,
  vigente_desde   DATE NOT NULL,
  motivo          TEXT,
  cambiado_por    UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_inversion_tasa_historial() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tasa_mensual IS DISTINCT FROM OLD.tasa_mensual THEN
    INSERT INTO inversion_tasa_historial
      (empresa_id, inversion_id, tasa_anterior, tasa_nueva, vigente_desde, cambiado_por)
    VALUES
      (NEW.empresa_id, NEW.id, OLD.tasa_mensual, NEW.tasa_mensual, CURRENT_DATE, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inversion_tasa_audit
  AFTER UPDATE OF tasa_mensual ON inversiones
  FOR EACH ROW EXECUTE FUNCTION trg_inversion_tasa_historial();

-- ============================================
-- LIQUIDACIONES — snapshot inmutable
-- ============================================
CREATE TABLE liquidaciones_inversion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  inversion_id    UUID NOT NULL REFERENCES inversiones(id) ON DELETE RESTRICT,
  periodo         DATE NOT NULL,                       -- mes/año de cálculo
  capital_base    DECIMAL(15,2) NOT NULL,              -- congelado al momento del cálculo
  tasa_aplicada   DECIMAL(5,2) NOT NULL,               -- congelada al momento del cálculo
  monto_interes   DECIMAL(15,2) NOT NULL,
  moneda          CHAR(3) NOT NULL DEFAULT 'ARS',
  estado          estado_liquidacion NOT NULL DEFAULT 'pendiente',
  fecha_pago      TIMESTAMPTZ,
  metodo_pago     VARCHAR(50),
  comprobante_url TEXT,
  external_ref    VARCHAR(100) UNIQUE,                 -- idempotencia con cron + n8n
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liquidaciones_inversion ON liquidaciones_inversion(inversion_id, periodo DESC);
CREATE INDEX idx_liquidaciones_estado ON liquidaciones_inversion(estado);
CREATE UNIQUE INDEX uniq_liquidacion_periodo ON liquidaciones_inversion(inversion_id, periodo);

CREATE TRIGGER audit_inversiones
  AFTER INSERT OR UPDATE OR DELETE ON inversiones
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();

CREATE TRIGGER audit_liquidaciones
  AFTER INSERT OR UPDATE OR DELETE ON liquidaciones_inversion
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
