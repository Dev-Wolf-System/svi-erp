-- ============================================================================
-- 0020 — Portal del inversor: solicitudes de aporte + modo solicitado
-- ============================================================================
-- Permite al inversor (desde el portal extranet, con su user de auth.users
-- vinculado a inversores.portal_user_id):
--
--   1. Solicitar un aporte adicional — queda como "pendiente" hasta que el
--      operador confirme la transferencia recibida (genera el aporte real
--      en inversion_aportes via action registrarAporte).
--
--   2. Indicar para cada liquidación PENDIENTE si quiere retirarla o
--      reinvertirla. Sólo el operador efectivamente paga, pero ya tiene la
--      preferencia del inversor antes de procesar.
-- ============================================================================

CREATE TYPE estado_solicitud_aporte AS ENUM (
  'pendiente',
  'confirmada',
  'rechazada',
  'expirada'
);

CREATE TABLE IF NOT EXISTS solicitudes_aporte (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  inversion_id    UUID NOT NULL REFERENCES inversiones(id) ON DELETE RESTRICT,
  inversor_id     UUID NOT NULL REFERENCES inversores(id) ON DELETE RESTRICT,

  monto_estimado  DECIMAL(15,2) NOT NULL CHECK (monto_estimado > 0),
  moneda          CHAR(3) NOT NULL,
  fecha_estimada  DATE NOT NULL,
  motivo          TEXT,

  estado          estado_solicitud_aporte NOT NULL DEFAULT 'pendiente',

  -- Cuando se confirma, queda link al aporte real generado.
  aporte_id       UUID REFERENCES inversion_aportes(id) ON DELETE SET NULL,
  motivo_rechazo  TEXT,
  resuelto_por    UUID REFERENCES usuarios(id),
  resuelto_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solic_aporte_estado
  ON solicitudes_aporte(estado, created_at DESC) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_solic_aporte_inversor
  ON solicitudes_aporte(inversor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solic_aporte_empresa
  ON solicitudes_aporte(empresa_id, estado, created_at DESC);

ALTER TABLE solicitudes_aporte ENABLE ROW LEVEL SECURITY;

-- Política para el lado admin (consume RLS via JWT claim empresa_id).
DROP POLICY IF EXISTS "solic_aporte_empresa" ON solicitudes_aporte;
CREATE POLICY "solic_aporte_empresa" ON solicitudes_aporte
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Decisión solicitada por el inversor antes del pago. Inicialmente NULL —
-- significa "no se decidió, usar default presencial/operador". Al pagar, si
-- modo_pago_inversor no se pasó explícito, la action puede usar este valor.
ALTER TABLE liquidaciones_inversion
  ADD COLUMN IF NOT EXISTS modo_solicitado_inversor VARCHAR(20);

ALTER TABLE liquidaciones_inversion
  DROP CONSTRAINT IF EXISTS liquidaciones_modo_solicitado_check;

ALTER TABLE liquidaciones_inversion
  ADD CONSTRAINT liquidaciones_modo_solicitado_check
  CHECK (
    modo_solicitado_inversor IS NULL
    OR modo_solicitado_inversor IN ('retirar', 'reinvertir')
  );

COMMENT ON TABLE solicitudes_aporte IS
  'Pedidos de aporte del inversor desde el portal extranet. Quedan pendientes hasta que el operador confirme (genera el aporte real) o rechace.';
COMMENT ON COLUMN liquidaciones_inversion.modo_solicitado_inversor IS
  'Preferencia del inversor para esta liquidación PENDIENTE (retirar/reinvertir). El admin puede honrarla o decidir distinto al pagar.';
