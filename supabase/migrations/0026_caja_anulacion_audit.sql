-- ============================================================================
-- 0026 — Campos de auditoría de anulación en movimientos_caja
-- ============================================================================
-- Contexto:
--   El trigger genérico trg_audit_log ya captura el UPDATE del soft-delete
--   (deleted_at: NULL → timestamp) en audit_log con datos_anteriores y
--   datos_nuevos. Pero para responder rápido "¿quién anuló este movimiento
--   y por qué?" sin parsear audit_log, conviene tener los campos directamente
--   en la fila. Estos campos son denormalización pragmática (la fuente de
--   verdad sigue siendo audit_log + el evento semántico
--   anular_con_motivo en metadata).
-- ============================================================================

ALTER TABLE movimientos_caja
  ADD COLUMN IF NOT EXISTS anulado_por      UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS anulado_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

-- Backfill: para movimientos ya anulados antes de esta migration
-- (deleted_at != NULL pero anulado_at NULL), copiamos deleted_at
-- a anulado_at para mantener histórico. anulado_por queda NULL
-- porque el trigger no guardó esa info en la fila (sí en audit_log).
UPDATE movimientos_caja
SET anulado_at = deleted_at
WHERE deleted_at IS NOT NULL AND anulado_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mov_anulado
  ON movimientos_caja(anulado_at)
  WHERE anulado_at IS NOT NULL;

COMMENT ON COLUMN movimientos_caja.anulado_por      IS 'Usuario que anuló el movimiento (denorm de audit_log).';
COMMENT ON COLUMN movimientos_caja.anulado_at       IS 'Timestamp de anulación (denorm de deleted_at + audit_log).';
COMMENT ON COLUMN movimientos_caja.motivo_anulacion IS 'Motivo libre ingresado al anular (capturado vía evento anular_con_motivo).';
