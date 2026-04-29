-- ============================================================================
-- 0019 — Aportes adicionales a una inversión
-- ============================================================================
-- Permite registrar capital que el inversor agrega después del aporte
-- inicial, sin abrir un contrato nuevo. Cada aporte queda auditable con
-- monto, fecha, motivo y comprobante. La action que lo persiste también
-- actualiza inversiones.capital_actual con redondeo half-even (motor F5.3).
--
-- Decisión de diseño: NO se modifica `inversiones.capital_inicial` — ese
-- campo es inmutable y pertenece al contrato original. El detalle de la
-- inversión muestra capital_actual desglosado vs aportes acumulados.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inversion_aportes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  inversion_id    UUID NOT NULL REFERENCES inversiones(id) ON DELETE RESTRICT,

  monto           DECIMAL(15,2) NOT NULL CHECK (monto > 0),
  moneda          CHAR(3) NOT NULL,
  fecha_aporte    DATE NOT NULL,

  motivo          TEXT,
  comprobante_url TEXT,
  registrado_por  UUID REFERENCES usuarios(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aportes_inversion
  ON inversion_aportes(inversion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aportes_empresa
  ON inversion_aportes(empresa_id, created_at DESC);

ALTER TABLE inversion_aportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aportes_empresa" ON inversion_aportes;
CREATE POLICY "aportes_empresa" ON inversion_aportes
  FOR ALL USING (empresa_id = auth.empresa_id());

COMMENT ON TABLE inversion_aportes IS
  'Aportes adicionales del inversor sobre una inversión existente. Cada uno actualiza capital_actual de la inversión.';
COMMENT ON COLUMN inversion_aportes.comprobante_url IS
  'URL del comprobante de transferencia/depósito que respalda el aporte. Provisto por el operador al registrar.';
