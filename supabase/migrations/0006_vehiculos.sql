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
