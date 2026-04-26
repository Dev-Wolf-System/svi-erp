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
