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
