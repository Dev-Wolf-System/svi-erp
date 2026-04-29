import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface InversorSession {
  /** auth.users.id */
  user_id: string;
  /** inversores.id */
  inversor_id: string;
  /** inversores.empresa_id — para construir queries scoped */
  empresa_id: string;
  nombre: string;
  email: string | null;
}

/**
 * Devuelve la sesión del inversor logueado en el portal, o null.
 *
 * Flujo:
 *   1. supabase.auth.getUser() valida la cookie del JWT (RPC al backend).
 *   2. Lookup en inversores por portal_user_id = auth.uid() y portal_activo.
 *   3. Si no matchea → no es un inversor habilitado → null.
 *
 * Usar service_role para el lookup porque las RLS de `inversores` filtran
 * por empresa_id (claim de admin) y el inversor no tiene ese claim. El
 * scope se garantiza con el filtro explícito por portal_user_id.
 */
export async function getInversorSession(): Promise<InversorSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data, error } = await service
    .from("inversores")
    .select("id, empresa_id, nombre, email, portal_activo, deleted_at")
    .eq("portal_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.portal_activo || data.deleted_at) return null;

  return {
    user_id: user.id,
    inversor_id: data.id as string,
    empresa_id: data.empresa_id as string,
    nombre: data.nombre as string,
    email: (data.email as string | null) ?? user.email ?? null,
  };
}

/**
 * Igual a `getInversorSession` pero throws en lugar de devolver null —
 * para usar en server actions que asumen sesión válida.
 */
export async function requireInversorSession(): Promise<InversorSession> {
  const s = await getInversorSession();
  if (!s) {
    throw new Error("Sesión de inversor inválida o expirada");
  }
  return s;
}
