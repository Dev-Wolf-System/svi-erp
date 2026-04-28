-- ============================================================================
-- 0014 — Persistir el init_point de Mercado Pago
-- ============================================================================
-- Hasta ahora se guardaba solo `mp_preference_id`. Para "reabrir el checkout"
-- de una preferencia previa sin tener que regenerarla, persistimos también la
-- URL `init_point` que devolvió MP al crearla.
--
-- Como las URLs de MP no expiran mientras la preferencia esté activa, sirve
-- como link directo a la pasarela. Si la preferencia ya expiró, el link
-- mostrará un error de MP y el operador puede regenerar desde la UI.
-- ============================================================================

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS mp_init_point TEXT;

COMMENT ON COLUMN ventas.mp_init_point IS
  'URL del checkout MP (init_point) de la preferencia activa. Persistido para reabrir sin regenerar.';
