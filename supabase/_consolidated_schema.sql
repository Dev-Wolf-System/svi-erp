-- ============================================================================
-- SVI ERP/CRM — SCHEMA CONSOLIDADO PARA SQL EDITOR
-- Generado automáticamente desde supabase/migrations/*.sql
-- Pegar TODO en el SQL Editor del Studio (Supabase) y ejecutar.
-- ============================================================================


-- ---------- 0001_extensions_and_enums.sql ----------
-- ============================================================================
-- 0001 — Extensiones y ENUMs base
-- ============================================================================
-- Fundación del schema. Debe correr antes que cualquier otra migración.
-- Extensiones: pg_trgm para LIKE rápido, pgsodium para cifrado columnas,
-- pg_cron para liberación de reservas + liquidaciones FCI mensuales.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- búsqueda full-text + similitud
CREATE EXTENSION IF NOT EXISTS "pgsodium";        -- cifrado columnas sensibles
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA pg_catalog;  -- jobs programados

-- ============================================
-- ENUMs (sincronizados con packages/database/src/schema/_shared.ts)
-- ============================================
CREATE TYPE tipo_vehiculo AS ENUM (
  'auto', '4x4', 'camioneta', 'moto', 'utilitario', 'otro'
);

CREATE TYPE condicion_vehiculo AS ENUM ('0km', 'usado');

CREATE TYPE estado_vehiculo AS ENUM (
  'stock', 'reservado', 'vendido', 'consignacion', 'preparacion', 'baja'
);

CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');

CREATE TYPE estado_venta AS ENUM (
  'reserva', 'documentacion', 'aprobado', 'entregado', 'finalizado', 'anulado'
);

CREATE TYPE estado_inversion AS ENUM ('activa', 'suspendida', 'finalizada');

CREATE TYPE estado_liquidacion AS ENUM ('pendiente', 'pagada', 'anulada');

-- Tipo de instrumento financiero — flexible para post-dictamen FCI (ver §13.3)
CREATE TYPE tipo_instrumento AS ENUM (
  'mutuo', 'fideicomiso', 'fci_cnv', 'prestamo_participativo', 'otro'
);

CREATE TYPE estado_regulatorio AS ENUM (
  'pre_dictamen', 'vigente', 'ajuste_requerido'
);


-- ---------- 0002_core_tables.sql ----------
-- ============================================================================
-- 0002 — Tablas core: empresas, sucursales, roles, usuarios, RBAC
-- ============================================================================

-- ============================================
-- EMPRESAS (raíz multi-tenancy)
-- ============================================
CREATE TABLE empresas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(100) NOT NULL,
  razon_social  VARCHAR(200),
  cuit          VARCHAR(13),
  logo_url      TEXT,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SUCURSALES
-- ============================================
CREATE TABLE sucursales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(100) NOT NULL,
  codigo        VARCHAR(10) NOT NULL,                  -- "AGU", "CON", "TUC"
  direccion     TEXT,
  telefono      VARCHAR(20),
  email         VARCHAR(100),
  tiene_caja    BOOLEAN NOT NULL DEFAULT TRUE,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE(empresa_id, codigo)
);

-- ============================================
-- ROLES y USUARIOS
-- ============================================
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(50) NOT NULL,
  permisos      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(empresa_id, nombre)
);

CREATE TABLE usuarios (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  telefono      VARCHAR(20),
  avatar_url    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Tabla puente: un usuario puede tener distintos roles en distintas sucursales
CREATE TABLE usuario_sucursal_rol (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sucursal_id   UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  rol_id        UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, sucursal_id)
);

CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usr_usuario ON usuario_sucursal_rol(usuario_id);
CREATE INDEX idx_usr_sucursal ON usuario_sucursal_rol(sucursal_id);


-- ---------- 0003_jwt_claims_hook.sql ----------
-- ============================================================================
-- 0003 — JWT Claims Hook (CORRECCIÓN TÉCNICA CRÍTICA — §8.3 del plan)
-- ============================================================================
-- Inyecta empresa_id, rol y sucursales[] en el JWT al login.
-- Esto permite que las RLS NO hagan subqueries a usuarios — performance ×10.
--
-- En Supabase Cloud: configurar en Auth > Hooks > Custom Access Token.
-- Localmente: ya queda referenciado en supabase/config.toml.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID := (event->>'user_id')::uuid;
  v_claims         JSONB := COALESCE(event->'claims', '{}'::jsonb);
  v_empresa_id     UUID;
  v_rol            TEXT;
  v_sucursales     UUID[];
  v_sucursal_ppal  UUID;
BEGIN
  -- Lookup principal: una sola query
  SELECT u.empresa_id INTO v_empresa_id
  FROM usuarios u
  WHERE u.id = v_user_id AND u.deleted_at IS NULL AND u.activo = TRUE;

  -- Si el usuario NO es interno (es del portal cliente/inversor) → no inyectar empresa_id
  IF v_empresa_id IS NULL THEN
    RETURN event;
  END IF;

  -- Rol "más alto" + lista de sucursales asignadas
  SELECT
    array_agg(usr.sucursal_id),
    MIN(r.nombre),
    MIN(usr.sucursal_id) FILTER (WHERE usr.es_principal) AS sucursal_ppal
  INTO v_sucursales, v_rol, v_sucursal_ppal
  FROM usuario_sucursal_rol usr
  JOIN roles r ON r.id = usr.rol_id
  WHERE usr.usuario_id = v_user_id;

  -- Inyectar app_metadata
  v_claims := jsonb_set(v_claims, '{app_metadata}', COALESCE(v_claims->'app_metadata', '{}'::jsonb));
  v_claims := jsonb_set(v_claims, '{app_metadata,empresa_id}', to_jsonb(v_empresa_id));
  v_claims := jsonb_set(v_claims, '{app_metadata,rol}', to_jsonb(COALESCE(v_rol, 'usuario')));
  v_claims := jsonb_set(v_claims, '{app_metadata,sucursales}', to_jsonb(COALESCE(v_sucursales, ARRAY[]::UUID[])));
  IF v_sucursal_ppal IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata,sucursal_ppal}', to_jsonb(v_sucursal_ppal));
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Permisos: solo el rol del Auth Hook puede ejecutarla
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================
-- Helpers para usar dentro de políticas RLS
-- ============================================
CREATE OR REPLACE FUNCTION auth.empresa_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.rol() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$;

CREATE OR REPLACE FUNCTION auth.sucursales() RETURNS UUID[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'sucursales')
  )::uuid[];
$$;

CREATE OR REPLACE FUNCTION auth.es_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT auth.rol() IN ('super_admin', 'admin');
$$;


-- ---------- 0004_numeracion_atomica.sql ----------
-- ============================================================================
-- 0004 — Numeración correlativa atómica (CORRECCIÓN CRÍTICA)
-- ============================================================================
-- Reemplaza el SELECT COUNT(*) original (race condition + lento).
-- Patrón: UPSERT con RETURNING garantiza que dos transacciones concurrentes
-- nunca obtengan el mismo número.
-- ============================================================================

CREATE TABLE numeracion_correlativos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL,        -- 'venta', 'inversion', 'liquidacion'
  codigo_sucursal VARCHAR(10) NOT NULL,
  anio            INT NOT NULL,
  ultimo_numero   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_numeracion UNIQUE (empresa_id, tipo, codigo_sucursal, anio)
);

-- Función atómica de numeración. Devuelve el número formateado.
CREATE OR REPLACE FUNCTION generar_numero_operacion(
  p_empresa_id      UUID,
  p_tipo            VARCHAR,
  p_codigo_sucursal VARCHAR
) RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio   INT := EXTRACT(YEAR FROM NOW());
  v_numero INT;
BEGIN
  INSERT INTO numeracion_correlativos
    (empresa_id, tipo, codigo_sucursal, anio, ultimo_numero)
  VALUES
    (p_empresa_id, p_tipo, p_codigo_sucursal, v_anio, 1)
  ON CONFLICT (empresa_id, tipo, codigo_sucursal, anio)
  DO UPDATE SET
    ultimo_numero = numeracion_correlativos.ultimo_numero + 1,
    updated_at    = NOW()
  RETURNING ultimo_numero INTO v_numero;

  RETURN 'SVI-' || p_codigo_sucursal || '-' || v_anio::TEXT || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$;

-- ============================================
-- WEBHOOKS — idempotencia obligatoria
-- ============================================
CREATE TABLE webhook_eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor     VARCHAR(30) NOT NULL,         -- 'mercadopago', 'afip', 'n8n', 'resend'
  external_id   VARCHAR(100) NOT NULL,         -- ID único del proveedor
  payload       JSONB NOT NULL,
  procesado     BOOLEAN NOT NULL DEFAULT FALSE,
  error         TEXT,
  intentos      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  procesado_at  TIMESTAMPTZ,
  CONSTRAINT uniq_webhook UNIQUE (proveedor, external_id)
);

CREATE INDEX idx_webhook_procesado ON webhook_eventos(procesado) WHERE procesado = FALSE;

-- ============================================
-- AUDIT LOG (financiero)
-- ============================================
CREATE TABLE audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID,
  tabla            VARCHAR(100) NOT NULL,
  operacion        VARCHAR(10) NOT NULL,         -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id      UUID NOT NULL,
  usuario_id       UUID,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  ip_address       INET,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_empresa_tabla ON audit_log(empresa_id, tabla, created_at DESC);
CREATE INDEX idx_audit_registro ON audit_log(tabla, registro_id);

-- Función reusable: trigger genérico de auditoría
CREATE OR REPLACE FUNCTION trg_audit_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_old JSONB := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_old_upd JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  v_empresa_id UUID;
  v_registro_id UUID;
BEGIN
  -- empresa_id se obtiene de la fila si existe
  IF v_new IS NOT NULL THEN
    v_empresa_id := (v_new->>'empresa_id')::uuid;
    v_registro_id := (v_new->>'id')::uuid;
  ELSE
    v_empresa_id := (v_old->>'empresa_id')::uuid;
    v_registro_id := (v_old->>'id')::uuid;
  END IF;

  INSERT INTO audit_log
    (empresa_id, tabla, operacion, registro_id, usuario_id,
     datos_anteriores, datos_nuevos)
  VALUES
    (v_empresa_id, TG_TABLE_NAME, TG_OP, v_registro_id, auth.uid(),
     COALESCE(v_old, v_old_upd), v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ---------- 0005_clientes_y_leads.sql ----------
-- ============================================================================
-- 0005 — Clientes y Leads (CRM)
-- ============================================================================

CREATE TABLE clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  tipo            VARCHAR(20) NOT NULL DEFAULT 'persona',  -- 'persona' | 'empresa'
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100),
  razon_social    VARCHAR(200),
  dni             VARCHAR(15),
  cuit            VARCHAR(13),
  email           VARCHAR(100),
  telefono        VARCHAR(20),
  celular         VARCHAR(20),
  direccion       TEXT,
  localidad       VARCHAR(100),
  provincia       VARCHAR(100),
  docs            JSONB NOT NULL DEFAULT '[]',
  portal_activo   BOOLEAN NOT NULL DEFAULT FALSE,
  portal_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  origen          VARCHAR(50),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_clientes_empresa ON clientes(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_dni ON clientes(dni) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_cuit ON clientes(cuit) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_email ON clientes(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_portal ON clientes(portal_user_id) WHERE portal_activo = TRUE;

CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id       UUID REFERENCES sucursales(id),
  nombre            VARCHAR(200),
  email             VARCHAR(100),
  telefono          VARCHAR(20),
  mensaje           TEXT,
  estado            VARCHAR(30) NOT NULL DEFAULT 'nuevo',
  vehiculo_interes  UUID,                          -- FK agregada en 0006
  vendedor_id       UUID REFERENCES usuarios(id),
  origen            VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_empresa ON leads(empresa_id);
CREATE INDEX idx_leads_estado ON leads(estado);

-- Audit + RLS aplican vía trigger genérico
CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();


-- ---------- 0006_vehiculos.sql ----------
-- ============================================================================
-- 0006 — Vehículos, precio_historial, traslados, búsqueda full-text, reservas
-- ============================================================================

CREATE TABLE vehiculos (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id                 UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,

  numero_interno              VARCHAR(20),
  patente                     VARCHAR(15) UNIQUE,
  vin                         VARCHAR(17),

  tipo                        tipo_vehiculo NOT NULL,
  condicion                   condicion_vehiculo NOT NULL,
  marca                       VARCHAR(50) NOT NULL,
  modelo                      VARCHAR(100) NOT NULL,
  version                     VARCHAR(100),
  anio                        INT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  color                       VARCHAR(50),
  kilometraje                 INT,
  combustible                 VARCHAR(30),
  transmision                 VARCHAR(20),
  motor                       VARCHAR(50),
  puertas                     INT,
  equipamiento                JSONB NOT NULL DEFAULT '[]',

  precio_compra               DECIMAL(15,2),
  precio_venta                DECIMAL(15,2) NOT NULL,
  moneda                      CHAR(3) NOT NULL DEFAULT 'ARS',

  estado                      estado_vehiculo NOT NULL DEFAULT 'stock',

  -- Reservas con expiración (pg_cron las libera — ver migración 0011)
  reservado_hasta             TIMESTAMPTZ,
  reservado_por_cliente_id    UUID REFERENCES clientes(id),

  fotos                       JSONB NOT NULL DEFAULT '[]',
  foto_principal_url          TEXT,
  observaciones               TEXT,
  historial_service           TEXT,

  es_consignacion             BOOLEAN NOT NULL DEFAULT FALSE,
  consignante_id              UUID REFERENCES clientes(id),

  ingresado_por               UUID REFERENCES usuarios(id),

  -- Búsqueda full-text con peso por relevancia
  search_vector               TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(marca,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(modelo,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(version,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(observaciones,'')), 'C')
  ) STORED,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_vehiculos_empresa ON vehiculos(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehiculos_sucursal ON vehiculos(sucursal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehiculos_estado ON vehiculos(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehiculos_marca_modelo ON vehiculos(marca, modelo);
CREATE INDEX idx_vehiculos_search ON vehiculos USING GIN (search_vector);
CREATE INDEX idx_vehiculos_patente_trgm ON vehiculos USING GIN (patente gin_trgm_ops);
CREATE INDEX idx_vehiculos_reserva_vencida ON vehiculos(reservado_hasta)
  WHERE estado = 'reservado' AND reservado_hasta IS NOT NULL;

-- FK pendiente en leads (declarada después por dependencia circular)
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_vehiculo
  FOREIGN KEY (vehiculo_interes) REFERENCES vehiculos(id) ON DELETE SET NULL;

-- ============================================
-- HISTORIAL DE PRECIOS — trigger automático
-- ============================================
CREATE TABLE vehiculo_precio_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  vehiculo_id     UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  precio_anterior DECIMAL(15,2),
  precio_nuevo    DECIMAL(15,2) NOT NULL,
  moneda          CHAR(3) NOT NULL DEFAULT 'ARS',
  motivo          TEXT,
  cambiado_por    UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_precio_historial_vehiculo ON vehiculo_precio_historial(vehiculo_id, created_at DESC);

CREATE OR REPLACE FUNCTION trg_vehiculo_precio_historial() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.precio_venta IS DISTINCT FROM OLD.precio_venta THEN
    INSERT INTO vehiculo_precio_historial
      (empresa_id, vehiculo_id, precio_anterior, precio_nuevo, moneda, cambiado_por)
    VALUES
      (NEW.empresa_id, NEW.id, OLD.precio_venta, NEW.precio_venta, NEW.moneda, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehiculo_precio_audit
  AFTER UPDATE OF precio_venta ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION trg_vehiculo_precio_historial();

CREATE TRIGGER audit_vehiculos
  AFTER INSERT OR UPDATE OR DELETE ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();

-- ============================================
-- TRASLADOS entre sucursales
-- ============================================
CREATE TABLE traslados (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  vehiculo_id         UUID NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
  sucursal_origen_id  UUID NOT NULL REFERENCES sucursales(id),
  sucursal_destino_id UUID NOT NULL REFERENCES sucursales(id),
  motivo              TEXT,
  estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  solicitado_por      UUID REFERENCES usuarios(id),
  confirmado_por      UUID REFERENCES usuarios(id),
  fecha_solicitud     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_confirmacion  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sucursal_origen_id != sucursal_destino_id)
);

CREATE INDEX idx_traslados_vehiculo ON traslados(vehiculo_id);
CREATE INDEX idx_traslados_estado ON traslados(estado);


-- ---------- 0007_inversiones_fci.sql ----------
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


-- ---------- 0008_ventas_y_bancos.sql ----------
-- ============================================================================
-- 0008 — Bancos, Ventas (con AFIP adapter ready desde día 1)
-- ============================================================================
-- Las columnas AFIP existen desde Fase 4 con AfipStubDriver.
-- Cuando el certificado real esté listo, solo cambia AFIP_DRIVER y se completan.
-- ============================================================================

CREATE TABLE bancos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(100) NOT NULL,
  contacto      VARCHAR(100),
  telefono      VARCHAR(20),
  email         VARCHAR(100),
  condiciones   JSONB NOT NULL DEFAULT '{}',
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bancos_empresa ON bancos(empresa_id) WHERE activo = TRUE;

CREATE TABLE ventas (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id                 UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,

  numero_operacion            VARCHAR(30) NOT NULL UNIQUE,        -- generado por SEQUENCE atómica

  vehiculo_id                 UUID NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
  cliente_id                  UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  vendedor_id                 UUID REFERENCES usuarios(id),

  precio_venta                DECIMAL(15,2) NOT NULL,
  moneda                      CHAR(3) NOT NULL DEFAULT 'ARS',
  descuento                   DECIMAL(15,2) NOT NULL DEFAULT 0,
  precio_final                DECIMAL(15,2) NOT NULL,

  tipo_pago                   VARCHAR(30) NOT NULL,               -- 'contado', 'financiado', 'parte_pago'

  -- Vehículo recibido como parte de pago
  vehiculo_parte_id           UUID REFERENCES vehiculos(id),
  valor_parte                 DECIMAL(15,2),

  -- Financiación bancaria
  banco_id                    UUID REFERENCES bancos(id),
  legajo_banco                VARCHAR(50),
  monto_financiado            DECIMAL(15,2),
  cuotas                      INT,
  tasa_banco                  DECIMAL(5,2),

  estado                      estado_venta NOT NULL DEFAULT 'reserva',

  -- SNAPSHOT INMUTABLE de comisión
  comision_pct                DECIMAL(5,2),
  comision_monto              DECIMAL(15,2),

  docs                        JSONB NOT NULL DEFAULT '[]',
  contrato_url                TEXT,

  -- Mercado Pago
  mp_preference_id            TEXT,
  mp_payment_id               TEXT,
  mp_status                   TEXT,

  -- AFIP — campos completos desde día 1 (driver intercambiable)
  afip_driver                 VARCHAR(20),
  cae                         VARCHAR(20),
  cae_vencimiento             DATE,
  tipo_comprobante            VARCHAR(20),
  punto_venta                 INT,
  numero_comprobante_afip     VARCHAR(30),
  comprobante_afip_url        TEXT,

  notas                       TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ,

  CHECK (precio_final >= 0),
  CHECK (descuento >= 0)
);

CREATE INDEX idx_ventas_cliente ON ventas(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventas_vehiculo ON ventas(vehiculo_id);
CREATE INDEX idx_ventas_sucursal_fecha ON ventas(sucursal_id, created_at DESC);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_empresa ON ventas(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventas_mp ON ventas(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

CREATE TRIGGER audit_ventas
  AFTER INSERT OR UPDATE OR DELETE ON ventas
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();


-- ---------- 0009_caja.sql ----------
-- ============================================================================
-- 0009 — Caja: movimientos y cierres por sucursal
-- ============================================================================

CREATE TABLE movimientos_caja (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id     UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  tipo            tipo_movimiento NOT NULL,
  categoria       VARCHAR(50) NOT NULL,    -- 'venta_contado', 'inversion_capital', 'liquidacion_inversion', 'gasto_operativo', etc.
  concepto        TEXT NOT NULL,
  monto           DECIMAL(15,2) NOT NULL CHECK (monto > 0),
  moneda          CHAR(3) NOT NULL DEFAULT 'ARS',
  -- Referencia polimórfica al origen (venta, liquidación, etc.)
  ref_tipo        VARCHAR(30),
  ref_id          UUID,
  registrado_por  UUID REFERENCES usuarios(id),
  fecha_operacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comprobante_url TEXT,
  mp_payment_id   TEXT,
  cierre_id       UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_mov_sucursal_fecha ON movimientos_caja(sucursal_id, fecha_operacion DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_mov_categoria ON movimientos_caja(categoria);
CREATE INDEX idx_mov_ref ON movimientos_caja(ref_tipo, ref_id);
CREATE INDEX idx_mov_cierre ON movimientos_caja(cierre_id) WHERE cierre_id IS NOT NULL;

CREATE TABLE cierres_caja (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id     UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  fecha           DATE NOT NULL,
  total_ingresos  DECIMAL(15,2) NOT NULL,
  total_egresos   DECIMAL(15,2) NOT NULL,
  saldo           DECIMAL(15,2) NOT NULL,
  cerrado_por     UUID REFERENCES usuarios(id),
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sucursal_id, fecha)
);

CREATE TRIGGER audit_movimientos_caja
  AFTER INSERT OR UPDATE OR DELETE ON movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();


-- ---------- 0010_rls_policies.sql ----------
-- ============================================================================
-- 0010 — Row Level Security (RLS) — patrón JWT claims (§8.3 corregido)
-- ============================================================================
-- Las políticas leen empresa_id, rol y sucursales[] del JWT inyectado por
-- custom_access_token_hook. Cero subqueries → performance ×10.
-- ============================================================================

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS OPERATIVAS
-- ============================================
ALTER TABLE empresas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_sucursal_rol      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculo_precio_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE traslados                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversion_tasa_historial  ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_inversion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE numeracion_correlativos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_eventos           ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS GENÉRICAS: aislamiento por empresa
-- ============================================
-- Patrón macro: cada tabla con empresa_id usa la misma política.
-- Para no repetir 50 políticas iguales, definimos por tabla.
-- ============================================

-- Empresas: solo el SUPER_ADMIN puede ver todas; el resto solo la suya.
CREATE POLICY "empresas_select" ON empresas
  FOR SELECT USING (
    auth.rol() = 'super_admin'
    OR id = auth.empresa_id()
  );

-- Sucursales
CREATE POLICY "sucursales_select" ON sucursales
  FOR SELECT USING (empresa_id = auth.empresa_id());
CREATE POLICY "sucursales_admin_all" ON sucursales
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Roles
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (empresa_id = auth.empresa_id());
CREATE POLICY "roles_admin_all" ON roles
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Usuarios
CREATE POLICY "usuarios_self" ON usuarios
  FOR SELECT USING (id = auth.uid() OR empresa_id = auth.empresa_id());
CREATE POLICY "usuarios_admin_all" ON usuarios
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

CREATE POLICY "usr_select" ON usuario_sucursal_rol
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR auth.es_admin()
  );

-- Clientes
CREATE POLICY "clientes_empresa" ON clientes
  FOR SELECT USING (empresa_id = auth.empresa_id() AND deleted_at IS NULL);
CREATE POLICY "clientes_write" ON clientes
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());
-- Portal: cliente solo se ve a sí mismo
CREATE POLICY "clientes_portal_self" ON clientes
  FOR SELECT USING (portal_user_id = auth.uid());

-- Leads
CREATE POLICY "leads_empresa" ON leads
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Vehículos: aislamiento por empresa + filtro por sucursales asignadas
CREATE POLICY "vehiculos_empresa_y_sucursal" ON vehiculos
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (
      auth.es_admin()                              -- admin/super_admin ven todas
      OR sucursal_id = ANY(auth.sucursales())     -- el resto solo sus sucursales
    )
  );
CREATE POLICY "vehiculos_write" ON vehiculos
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());

CREATE POLICY "vehiculo_precio_hist_empresa" ON vehiculo_precio_historial
  FOR SELECT USING (empresa_id = auth.empresa_id());

CREATE POLICY "traslados_empresa" ON traslados
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Inversores (sensible)
CREATE POLICY "inversores_empresa" ON inversores
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "inversores_write" ON inversores
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());
-- Portal del inversor: solo se ve a sí mismo
CREATE POLICY "inversores_portal_self" ON inversores
  FOR SELECT USING (portal_user_id = auth.uid());

-- Inversiones
CREATE POLICY "inversiones_empresa" ON inversiones
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "inversiones_write" ON inversiones
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());
CREATE POLICY "inversiones_portal_self" ON inversiones
  FOR SELECT USING (
    inversor_id IN (SELECT id FROM inversores WHERE portal_user_id = auth.uid())
  );

-- Liquidaciones: misma lógica
CREATE POLICY "liquidaciones_empresa" ON liquidaciones_inversion
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "liquidaciones_portal_self" ON liquidaciones_inversion
  FOR SELECT USING (
    inversion_id IN (
      SELECT inv.id FROM inversiones inv
      JOIN inversores i ON i.id = inv.inversor_id
      WHERE i.portal_user_id = auth.uid()
    )
  );
CREATE POLICY "liquidaciones_write" ON liquidaciones_inversion
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

CREATE POLICY "tasa_hist_empresa" ON inversion_tasa_historial
  FOR SELECT USING (empresa_id = auth.empresa_id() AND auth.es_admin());

-- Bancos
CREATE POLICY "bancos_empresa" ON bancos
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Ventas
CREATE POLICY "ventas_empresa_y_sucursal" ON ventas
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "ventas_write" ON ventas
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());
-- Portal cliente: solo sus propias ventas
CREATE POLICY "ventas_portal_self" ON ventas
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE portal_user_id = auth.uid())
  );

-- Caja
CREATE POLICY "mov_caja_empresa_y_sucursal" ON movimientos_caja
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "mov_caja_write" ON movimientos_caja
  FOR ALL USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente', 'caja')
  );

CREATE POLICY "cierres_caja_empresa" ON cierres_caja
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "cierres_caja_write" ON cierres_caja
  FOR ALL USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente', 'caja')
  );

-- Audit log: solo admin/super_admin lee
CREATE POLICY "audit_admin" ON audit_log
  FOR SELECT USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Numeración correlativos: solo lectura para admin (no debería editarse a mano)
CREATE POLICY "numeracion_admin" ON numeracion_correlativos
  FOR SELECT USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Webhook eventos: solo service role accede (RLS bloquea todo lo demás)
-- (No hay política de SELECT/INSERT pública → tabla cerrada salvo service_role bypass)


-- ---------- 0011_cron_jobs.sql ----------
-- ============================================================================
-- 0011 — Jobs programados (pg_cron)
-- ============================================================================
-- Liberación de reservas vencidas + recordatorio de liquidaciones FCI.
-- pg_cron requiere database superuser; en Supabase se configura desde el panel
-- o via API. En entornos de desarrollo, este SQL puede no ejecutarse según permisos.
-- ============================================================================

-- ============================================
-- LIBERACIÓN AUTOMÁTICA DE RESERVAS VENCIDAS
-- Corre cada hora (en TZ del servidor — recomendado UTC)
-- ============================================
SELECT cron.schedule(
  'liberar-reservas-vencidas',
  '0 * * * *',
  $$
    UPDATE vehiculos
    SET estado = 'stock',
        reservado_hasta = NULL,
        reservado_por_cliente_id = NULL,
        updated_at = NOW()
    WHERE estado = 'reservado'
      AND reservado_hasta IS NOT NULL
      AND reservado_hasta < NOW()
      AND deleted_at IS NULL;
  $$
);

-- ============================================
-- LIQUIDACIÓN MENSUAL FCI — disparador
-- Corre día 1 de cada mes a las 06:00 UTC (~03:00 AR)
-- El cálculo real lo hace una Edge Function (idempotente vía external_ref).
-- Este cron solo dispara el proceso vía pg_notify para que n8n / Edge lo recoja.
-- ============================================
SELECT cron.schedule(
  'liquidacion-fci-mensual',
  '0 6 1 * *',
  $$
    SELECT pg_notify(
      'svi_jobs',
      json_build_object(
        'job', 'liquidacion_mensual_fci',
        'periodo', date_trunc('month', NOW())::date,
        'triggered_at', NOW()
      )::text
    );
  $$
);


-- ============================================================================
-- SEEDS DE DEMO (opcional — borrar antes de producción)
-- ============================================================================

-- ---------- 01_empresas_y_sucursales.sql ----------
-- ============================================================================
-- SEED — datos iniciales para desarrollo local
-- ============================================================================
-- NO correr en producción. Diseñado para `supabase db reset` local.
-- ============================================================================

INSERT INTO empresas (id, nombre, razon_social, cuit, config) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Solo Vehículos Impecables',
    'SVI S.A.',
    '30-71234567-8',
    jsonb_build_object(
      'modulos_activos', ARRAY['stock', 'ventas', 'clientes', 'inversiones', 'caja', 'reportes'],
      'moneda_default', 'ARS',
      'monedas_aceptadas', ARRAY['ARS', 'USD'],
      'tasa_fci_default', 5.0,
      'dias_reserva_default', 7,
      'afip_driver', 'stub',
      'branding', jsonb_build_object(
        'primary_color', '#C8102E',
        'secondary_color', '#C5A059'
      )
    )
  );

INSERT INTO sucursales (id, empresa_id, nombre, codigo, direccion, telefono, tiene_caja) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Aguilares', 'AGU', 'Av. Sarmiento 100, Aguilares, Tucumán', '+54 9 3865 555-0001', true
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Concepción', 'CON', 'Av. Mitre 500, Concepción, Tucumán', '+54 9 3865 555-0002', true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'San Miguel de Tucumán', 'TUC', 'Av. Mate de Luna 1500, S.M. de Tucumán', '+54 9 3815 555-0003', true
  );

-- Roles base
INSERT INTO roles (id, empresa_id, nombre, permisos) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'super_admin', '["*"]'::jsonb),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'admin', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'gerente', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'vendedor', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'caja', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'secretaria', '[]'::jsonb);


-- ---------- 02_vehiculos_demo.sql ----------
-- ============================================================================
-- SEED — vehículos de demostración para landing y admin
-- ============================================================================

INSERT INTO vehiculos
  (empresa_id, sucursal_id, patente, tipo, condicion, marca, modelo, version, anio, color,
   kilometraje, combustible, transmision, precio_venta, moneda, estado, foto_principal_url, equipamiento)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'AC123BD', 'auto', '0km', 'Toyota', 'Corolla', 'XEi 2.0 CVT', 2026, 'Blanco perla',
   0, 'Nafta', 'CVT', 28500000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1623869675781-80aa31012c78?w=800',
   '["AA","Cierre centralizado","Bluetooth","Cámara de retroceso","6 airbags"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'AB456CD', '4x4', 'usado', 'Toyota', 'Hilux', 'SRX 4x4 AT', 2023, 'Gris oscuro',
   45000, 'Diesel', 'Automática', 42000000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800',
   '["4x4","Cuero","Climatizador","GPS","Llantas 18"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'AD789EF', 'camioneta', '0km', 'Volkswagen', 'Amarok', 'V6 Highline', 2026, 'Negro',
   0, 'Diesel', 'Automática', 58900000, 'ARS', 'reservado',
   'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800',
   '["V6","Cuero","Techo Corredizo","Sensores 360"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'AG321HI', 'auto', 'usado', 'Ford', 'Focus', 'Titanium 2.0', 2021, 'Rojo',
   62000, 'Nafta', 'Automática', 18500000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800',
   '["Cuero","Sunroof","Sensores","Llantas 17"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'AH654JK', 'moto', '0km', 'Honda', 'CB 500F', 'Standard', 2026, 'Roja',
   0, 'Nafta', 'Manual', 9800000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
   '["ABS","LED","Tablero digital"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'AI987LM', 'utilitario', 'usado', 'Renault', 'Kangoo', 'Express', 2022, 'Blanco',
   38000, 'Diesel', 'Manual', 15700000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
   '["AA","Radio","ABS"]'::jsonb);

