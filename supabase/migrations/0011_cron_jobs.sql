-- ============================================================================
-- 0011 — Jobs programados (pg_cron)
-- ============================================================================
-- Liberación de reservas vencidas + recordatorio de liquidaciones FCI.
-- pg_cron requiere database superuser; en Supabase se configura desde el panel
-- o via API. En entornos de desarrollo, este SQL puede no ejecutarse según permisos.
-- ============================================================================

-- ============================================
-- LIBERACIÓN AUTOMÁTICA DE RESERVAS VENCIDAS
-- Corre cada hora (en TZ del servidor — recomendado UTC)
-- ============================================
SELECT cron.schedule(
  'liberar-reservas-vencidas',
  '0 * * * *',
  $$
    UPDATE vehiculos
    SET estado = 'stock',
        reservado_hasta = NULL,
        reservado_por_cliente_id = NULL,
        updated_at = NOW()
    WHERE estado = 'reservado'
      AND reservado_hasta IS NOT NULL
      AND reservado_hasta < NOW()
      AND deleted_at IS NULL;
  $$
);

-- ============================================
-- LIQUIDACIÓN MENSUAL FCI — disparador
-- Corre día 1 de cada mes a las 06:00 UTC (~03:00 AR)
-- El cálculo real lo hace una Edge Function (idempotente vía external_ref).
-- Este cron solo dispara el proceso vía pg_notify para que n8n / Edge lo recoja.
-- ============================================
SELECT cron.schedule(
  'liquidacion-fci-mensual',
  '0 6 1 * *',
  $$
    SELECT pg_notify(
      'svi_jobs',
      json_build_object(
        'job', 'liquidacion_mensual_fci',
        'periodo', date_trunc('month', NOW())::date,
        'triggered_at', NOW()
      )::text
    );
  $$
);
