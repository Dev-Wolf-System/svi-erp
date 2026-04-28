-- ============================================================================
-- 0013 — SECURITY DEFINER en funciones internas que escriben en tablas con RLS
-- ============================================================================
-- Síntoma que motivó esta migration:
--   "new row violates row-level security policy for table audit_log"
--   al hacer INSERT/UPDATE en cualquier tabla auditada (clientes, ventas, etc).
--
-- Causa:
--   `trg_audit_log()` se ejecuta con los privilegios del usuario authenticated.
--   `audit_log` tiene RLS habilitada con policy SELECT-only (auditoría inmutable
--   para admins). Cuando el trigger intenta INSERT, la RLS lo bloquea.
--
--   Misma situación con `generar_numero_operacion()`: escribe en
--   `numeracion_correlativos` (RLS habilitada, sin policy INSERT para users).
--
-- Fix:
--   SECURITY DEFINER → la función corre con privilegios del owner (postgres),
--   bypassa RLS. Es seguro porque ambas funciones SOLO se invocan desde
--   triggers/RPCs internos — no se exponen como endpoints públicos.
--
-- Hardening:
--   `SET search_path` explícito para evitar escalación vía hijack del path
--   (best practice OWASP/PostgreSQL para SECURITY DEFINER).
--
-- Notas:
--   - `auth.uid()` sigue funcionando porque lee de `request.jwt.claims`
--     (sesión), no del usuario PostgreSQL. El log queda con el usuario real.
--   - Idempotente: ALTER FUNCTION es seguro ejecutar múltiples veces.
-- ============================================================================

ALTER FUNCTION trg_audit_log() SECURITY DEFINER SET search_path = public, pg_temp, auth;

ALTER FUNCTION generar_numero_operacion(UUID, VARCHAR, VARCHAR)
  SECURITY DEFINER SET search_path = public, pg_temp;
