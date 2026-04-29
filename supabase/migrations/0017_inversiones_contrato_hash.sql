-- ============================================================================
-- 0017 — Autenticidad del contrato FCI (hash + version)
-- ============================================================================
-- Mismo patrón que ventas (migration 0015): cada PDF generado lleva un
-- SHA-256 del payload canónico impreso en el footer + QR. La página pública
-- /vi/<numero_contrato> recalcula y compara.
--
-- `firma_metodo` ya existía en inversiones desde la migration original 0007
-- con CHECK propio — no se toca acá.
-- ============================================================================

ALTER TABLE inversiones
  ADD COLUMN IF NOT EXISTS contrato_hash    TEXT,
  ADD COLUMN IF NOT EXISTS contrato_version INT  NOT NULL DEFAULT 0;

COMMENT ON COLUMN inversiones.contrato_hash IS
  'SHA-256 hex del payload canónico del contrato FCI. Verificable en /vi/<numero_contrato>.';
COMMENT ON COLUMN inversiones.contrato_version IS
  'Cantidad de veces que se regeneró el PDF. Se incrementa al subir cada versión nueva al bucket.';
