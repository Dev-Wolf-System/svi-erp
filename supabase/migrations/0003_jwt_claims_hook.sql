-- ============================================================================
-- 0003 — JWT Claims Hook (CORRECCIÓN TÉCNICA CRÍTICA — §8.3 del plan)
-- ============================================================================
-- Inyecta empresa_id, rol y sucursales[] en el JWT al login.
-- Esto permite que las RLS NO hagan subqueries a usuarios — performance ×10.
--
-- En Supabase Cloud: configurar en Auth > Hooks > Custom Access Token.
-- Localmente: ya queda referenciado en supabase/config.toml.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID := (event->>'user_id')::uuid;
  v_claims         JSONB := COALESCE(event->'claims', '{}'::jsonb);
  v_empresa_id     UUID;
  v_rol            TEXT;
  v_sucursales     UUID[];
  v_sucursal_ppal  UUID;
BEGIN
  -- Lookup principal: una sola query
  SELECT u.empresa_id INTO v_empresa_id
  FROM usuarios u
  WHERE u.id = v_user_id AND u.deleted_at IS NULL AND u.activo = TRUE;

  -- Si el usuario NO es interno (es del portal cliente/inversor) → no inyectar empresa_id
  IF v_empresa_id IS NULL THEN
    RETURN event;
  END IF;

  -- Lista de sucursales asignadas + rol (PG no tiene MIN(uuid), por eso 2 selects)
  SELECT
    array_agg(usr.sucursal_id),
    MIN(r.nombre)
  INTO v_sucursales, v_rol
  FROM usuario_sucursal_rol usr
  JOIN roles r ON r.id = usr.rol_id
  WHERE usr.usuario_id = v_user_id;

  SELECT usr.sucursal_id INTO v_sucursal_ppal
  FROM usuario_sucursal_rol usr
  WHERE usr.usuario_id = v_user_id AND usr.es_principal
  LIMIT 1;

  -- Inyectar app_metadata
  v_claims := jsonb_set(v_claims, '{app_metadata}', COALESCE(v_claims->'app_metadata', '{}'::jsonb));
  v_claims := jsonb_set(v_claims, '{app_metadata,empresa_id}', to_jsonb(v_empresa_id));
  v_claims := jsonb_set(v_claims, '{app_metadata,rol}', to_jsonb(COALESCE(v_rol, 'usuario')));
  v_claims := jsonb_set(v_claims, '{app_metadata,sucursales}', to_jsonb(COALESCE(v_sucursales, ARRAY[]::UUID[])));
  IF v_sucursal_ppal IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata,sucursal_ppal}', to_jsonb(v_sucursal_ppal));
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Permisos: solo el rol del Auth Hook puede ejecutarla
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================
-- Helpers para usar dentro de políticas RLS
-- ============================================
CREATE OR REPLACE FUNCTION auth.empresa_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.rol() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$;

CREATE OR REPLACE FUNCTION auth.sucursales() RETURNS UUID[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'sucursales')
  )::uuid[];
$$;

CREATE OR REPLACE FUNCTION auth.es_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT auth.rol() IN ('super_admin', 'admin');
$$;
