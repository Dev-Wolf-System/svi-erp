import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE_ROLE — bypassa RLS.
 *
 * Solo usar en server actions o webhooks para operaciones que requieren
 * privilegios elevados (Storage de contratos firmados, escritura en
 * audit_log fuera de transacción, jobs N8N).
 *
 * NUNCA exponer este cliente al runtime cliente. NUNCA usar para queries
 * de listado normales (rompe el aislamiento por empresa_id de RLS).
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
