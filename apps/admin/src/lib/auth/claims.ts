import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSviJwt, type SviAppMetadata } from "@repo/utils";

export interface SviClaims extends SviAppMetadata {
  /** user_id (auth.users.id) — `sub` del JWT */
  sub: string;
}

/**
 * Lee los claims SVI inyectados por el hook `custom_access_token_hook`.
 *
 * IMPORTANTE: NO usar `supabase.auth.getUser().user.app_metadata` para esto —
 * eso devuelve `auth.users.raw_app_meta_data` (la columna en DB), que NO
 * contiene los claims del hook. El hook solo inyecta en el JWT al emitirlo.
 *
 * Este helper:
 *   1. Verifica identidad con `getUser()` (RPC al backend, valida firma).
 *   2. Lee el JWT del cookie via `getSession()` (sin RPC, sin re-validar).
 *   3. Decodifica el payload y extrae `app_metadata` (donde el hook inyectó).
 *
 * Devuelve `null` si no hay sesión o si el JWT no tiene los claims SVI
 * (caso típico: hook no activado en self-hosted; ver supabase/SETUP.md §2).
 */
export async function getSviClaims(): Promise<SviClaims | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const payload = decodeJwtPayload(session.access_token);
  if (!isSviJwt(payload)) return null;

  return { ...payload.app_metadata, sub: payload.sub };
}

/** Decodifica el payload (parte del medio) de un JWT sin verificar firma. */
function decodeJwtPayload(jwt: string): unknown {
  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
