-- ============================================================================
-- 0012 — Constraints adicionales sobre ventas + snapshot de comisión
-- ============================================================================
-- 0008 dejó la tabla `ventas` con CHECKs mínimos (precio >= 0, descuento >= 0).
-- Acá blindamos las invariantes que el módulo y el contrato PDF asumen:
--
--   1. tipo_pago restringido al dominio que el wizard sabe procesar.
--   2. Cuando tipo_pago = 'parte_pago' deben existir vehiculo_parte y valor.
--   3. Cuando tipo_pago = 'financiado' deben existir banco y datos crediticios.
--   4. descuento nunca supera el precio de lista.
--   5. cuotas y tasa dentro de rangos razonables del mercado AR.
--   6. comision_pct entre 0 y 100; pct y monto siempre van juntos
--      (si uno es NULL el otro también — el snapshot es atómico).
--
-- Idempotente: usa `IF NOT EXISTS` en formato pg14+.
-- ============================================================================

ALTER TABLE ventas
  ADD CONSTRAINT ventas_tipo_pago_valido
  CHECK (tipo_pago IN ('contado', 'financiado', 'parte_pago'));

ALTER TABLE ventas
  ADD CONSTRAINT ventas_descuento_no_supera_precio
  CHECK (descuento <= precio_venta);

ALTER TABLE ventas
  ADD CONSTRAINT ventas_parte_pago_completo
  CHECK (
    tipo_pago <> 'parte_pago'
    OR (vehiculo_parte_id IS NOT NULL AND valor_parte IS NOT NULL AND valor_parte > 0)
  );

ALTER TABLE ventas
  ADD CONSTRAINT ventas_financiado_completo
  CHECK (
    tipo_pago <> 'financiado'
    OR (
      banco_id IS NOT NULL
      AND monto_financiado IS NOT NULL AND monto_financiado > 0
      AND cuotas IS NOT NULL AND cuotas > 0
      AND tasa_banco IS NOT NULL
    )
  );

-- Cuotas razonables: entre 1 y 120 (10 años — máximo financiación auto AR)
ALTER TABLE ventas
  ADD CONSTRAINT ventas_cuotas_rango
  CHECK (cuotas IS NULL OR (cuotas BETWEEN 1 AND 120));

-- TNA bancaria entre 0% y 999% (techo nominal — la inflación AR habilita TNAs muy altas)
ALTER TABLE ventas
  ADD CONSTRAINT ventas_tasa_banco_rango
  CHECK (tasa_banco IS NULL OR (tasa_banco BETWEEN 0 AND 999.99));

-- Comisión: porcentaje válido y snapshot atómico (pct y monto van juntos).
ALTER TABLE ventas
  ADD CONSTRAINT ventas_comision_pct_rango
  CHECK (comision_pct IS NULL OR (comision_pct BETWEEN 0 AND 100));

ALTER TABLE ventas
  ADD CONSTRAINT ventas_comision_monto_no_negativo
  CHECK (comision_monto IS NULL OR comision_monto >= 0);

ALTER TABLE ventas
  ADD CONSTRAINT ventas_comision_snapshot_atomico
  CHECK (
    (comision_pct IS NULL AND comision_monto IS NULL)
    OR (comision_pct IS NOT NULL AND comision_monto IS NOT NULL)
  );

-- AFIP: si hay CAE, deben estar todos los datos del comprobante.
-- (El CAE solo lo escribe el adapter después de FECAESolicitar, nunca a mano.)
ALTER TABLE ventas
  ADD CONSTRAINT ventas_afip_cae_completo
  CHECK (
    cae IS NULL
    OR (
      cae_vencimiento IS NOT NULL
      AND tipo_comprobante IS NOT NULL
      AND punto_venta IS NOT NULL
      AND numero_comprobante_afip IS NOT NULL
      AND afip_driver IS NOT NULL
    )
  );

-- afip_driver acotado al dominio del adapter (ver packages/integrations/afip)
ALTER TABLE ventas
  ADD CONSTRAINT ventas_afip_driver_valido
  CHECK (afip_driver IS NULL OR afip_driver IN ('stub', 'sandbox', 'production'));
