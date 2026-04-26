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
