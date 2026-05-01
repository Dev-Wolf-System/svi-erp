-- ============================================================================
-- 0025 — Extensiones a la auditoría existente (audit_log de migration 0004)
-- ============================================================================
-- Contexto:
--   La migration 0004 ya creó `audit_log` + `trg_audit_log()` (genérico, captura
--   INSERT/UPDATE/DELETE como JSONB old/new). El trigger ya está aplicado en
--   `movimientos_caja` (0009) y otras tablas. La 0013 le puso SECURITY DEFINER
--   para bypassear la RLS de audit_log.
--
-- Esta migration agrega 3 cosas pequeñas, sin tocar lo existente:
--   1. Trigger genérico también en `cierres_caja` (no lo tenía).
--   2. Columna `metadata JSONB` en `audit_log` para eventos semánticos
--      (motivo de anulación, action override, ip, user_agent, etc.).
--   3. Helper `fn_audit_log_event()` para insertar eventos manuales desde
--      server actions (acciones que NO son CRUD: anular_con_motivo, exportar,
--      imprimir, login, etc.). Pseudo-operación 'EVENT' las distingue.
-- ============================================================================

-- 1. Trigger en cierres_caja (no lo tenía la 0009)
DROP TRIGGER IF EXISTS audit_cierres_caja ON cierres_caja;
CREATE TRIGGER audit_cierres_caja
  AFTER INSERT OR UPDATE OR DELETE ON cierres_caja
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();

-- 2. Columna metadata para eventos semánticos
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN audit_log.metadata IS
  'Eventos semánticos: { "action": "anular_con_motivo", "motivo": "...", "ip": "...", "ua": "..." }. NULL para INSERT/UPDATE/DELETE auto-capturados por trg_audit_log.';

-- Índice funcional para filtrar por action semántica (búsqueda rápida en UI)
CREATE INDEX IF NOT EXISTS idx_audit_log_metadata_action
  ON audit_log ((metadata ->> 'action'))
  WHERE metadata ? 'action';

-- 3. Helper SQL para insertar eventos manuales (fail-open desde server actions)
--    SECURITY DEFINER por la misma razón que trg_audit_log: la RLS de audit_log
--    es SELECT-only para admins, los INSERT solo deben poder hacerse vía esta
--    función (o el trigger genérico).
CREATE OR REPLACE FUNCTION fn_audit_log_event(
  p_empresa_id       UUID,
  p_user_id          UUID,
  p_tabla            VARCHAR,
  p_registro_id      UUID,
  p_action           VARCHAR,        -- semantic action: 'anular_con_motivo', 'exportar', etc.
  p_metadata         JSONB DEFAULT NULL,
  p_datos_anteriores JSONB DEFAULT NULL,
  p_datos_nuevos     JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
DECLARE
  v_id       UUID;
  v_metadata JSONB;
BEGIN
  -- Mergear action en metadata para queries fáciles via metadata->>'action'
  v_metadata := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('action', p_action);

  INSERT INTO audit_log (
    empresa_id, tabla, operacion, registro_id, usuario_id,
    datos_anteriores, datos_nuevos, metadata, created_at
  ) VALUES (
    p_empresa_id,
    p_tabla,
    'EVENT',                   -- pseudo-operación que distingue eventos manuales
    p_registro_id,
    p_user_id,
    p_datos_anteriores,
    p_datos_nuevos,
    v_metadata,
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION fn_audit_log_event(UUID, UUID, VARCHAR, UUID, VARCHAR, JSONB, JSONB, JSONB) IS
  'Inserta evento semántico en audit_log con operacion=''EVENT''. Usar SOLO para acciones que no son CRUD básico (anular_con_motivo, exportar, imprimir, login). Para INSERT/UPDATE/DELETE el trigger trg_audit_log ya los captura.';
