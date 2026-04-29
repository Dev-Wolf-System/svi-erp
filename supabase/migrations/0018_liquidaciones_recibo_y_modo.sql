-- ============================================================================
-- 0018 — Recibo de pago + modo retirar/reinvertir en liquidaciones
-- ============================================================================
-- Cada liquidación pagada genera un recibo PDF firmado con hash + QR.
-- El inversor decide al cobrar si retira el dinero o lo reinvierte (suma
-- al capital actual de la inversión). La decisión queda asentada en el
-- recibo y en la DB.
--
-- También limpio el hack del motivo de anulación (que iba pegado al
-- comprobante_url): nueva columna motivo_anulacion dedicada.
-- ============================================================================

ALTER TABLE liquidaciones_inversion
  ADD COLUMN IF NOT EXISTS modo_pago_inversor VARCHAR(20)
    NOT NULL DEFAULT 'retirar',
  ADD COLUMN IF NOT EXISTS recibo_url     TEXT,
  ADD COLUMN IF NOT EXISTS recibo_hash    TEXT,
  ADD COLUMN IF NOT EXISTS recibo_version INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

ALTER TABLE liquidaciones_inversion
  DROP CONSTRAINT IF EXISTS liquidaciones_modo_pago_inversor_check;

ALTER TABLE liquidaciones_inversion
  ADD CONSTRAINT liquidaciones_modo_pago_inversor_check
  CHECK (modo_pago_inversor IN ('retirar', 'reinvertir'));

COMMENT ON COLUMN liquidaciones_inversion.modo_pago_inversor IS
  'Decisión del inversor al cobrar: retirar (recibe el dinero) o reinvertir (se suma al capital_actual de la inversion).';
COMMENT ON COLUMN liquidaciones_inversion.recibo_url IS
  'Path en bucket recibos-liquidacion del PDF firmado. Generado al marcar como pagada.';
COMMENT ON COLUMN liquidaciones_inversion.recibo_hash IS
  'SHA-256 del payload canónico del recibo. Verificable en /vr/<id>.';
