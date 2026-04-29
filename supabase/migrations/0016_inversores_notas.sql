-- ============================================================================
-- 0016 — Notas internas en inversores
-- ============================================================================
-- El módulo F5.1 (apps/admin/src/modules/inversores) acepta `notas` en el
-- form de alta y las muestra en el detalle, pero la tabla original no tenía
-- esa columna. Migration aditiva — sin riesgo.
-- ============================================================================

ALTER TABLE inversores
  ADD COLUMN IF NOT EXISTS notas TEXT;

COMMENT ON COLUMN inversores.notas IS
  'Observaciones internas del inversor (no expuestas en portal extranet).';
