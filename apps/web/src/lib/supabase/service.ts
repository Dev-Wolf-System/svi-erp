import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente service_role del portal — bypassa RLS.
 *
 * Pensado SÓLO para queries y actions del portal extranet donde el filtro
 * por inversor lo hacemos manualmente cruzando `inversores.portal_user_id`
 * contra el `auth.uid()` del JWT del inversor logueado.
 *
 * Cuidados:
 *   - NUNCA exponer al runtime cliente.
 *   - NUNCA usar para queries sin filtro explícito por portal_user_id —
 *     romperíamos el aislamiento entre inversores.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no configurado. Definir en .env (server-only).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
