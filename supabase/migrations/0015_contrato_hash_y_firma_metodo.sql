-- ============================================================================
-- 0015 — Autenticidad del contrato PDF (hash + firma_metodo + version)
-- ============================================================================
-- Cada PDF generado lleva un SHA-256 del payload canónico (datos del contrato
-- normalizados) impreso en el footer junto con un QR a la página pública de
-- verificación. El hash se persiste para que la página pública pueda
-- recalcular y comparar — anti-tamper sin terceros.
--
-- `firma_metodo` queda como placeholder para sumar firma electrónica externa
-- (TokenSign, ZapSign, FirmaAR) cuando se contrate, sin rediseño.
--
-- `contrato_version` se incrementa cada vez que se regenera el PDF —
-- distintas versiones tienen distinto hash. La versión visible en el footer
-- evita confusión entre PDFs imprimibles del mismo contrato.
-- ============================================================================

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS contrato_hash    TEXT,
  ADD COLUMN IF NOT EXISTS contrato_version INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS firma_metodo     VARCHAR(20) NOT NULL DEFAULT 'presencial';

ALTER TABLE ventas
  DROP CONSTRAINT IF EXISTS ventas_firma_metodo_check;

ALTER TABLE ventas
  ADD CONSTRAINT ventas_firma_metodo_check
  CHECK (firma_metodo IN ('presencial', 'digital_afip', 'tokensign', 'zapsign', 'firmar_ar', 'otro'));

COMMENT ON COLUMN ventas.contrato_hash IS
  'SHA-256 hex del payload canónico del contrato. Se imprime en cada hoja del PDF junto con un QR a /v/<numero_op>. La página pública recalcula el hash y lo compara para validar integridad.';
COMMENT ON COLUMN ventas.contrato_version IS
  'Cantidad de veces que se regeneró el PDF. Se incrementa al subir cada versión nueva al bucket.';
COMMENT ON COLUMN ventas.firma_metodo IS
  'Mecanismo de firma del contrato. Default presencial; cuando se contrate firma electrónica externa, los nuevos contratos llevan el método correspondiente.';
