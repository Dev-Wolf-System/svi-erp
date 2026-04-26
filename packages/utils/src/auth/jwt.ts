import type { Rol } from "@repo/config/constants";

/**
 * Forma esperada de los claims que inyecta el hook custom_access_token_hook
 * en Supabase Auth (ver §8.3 del plan).
 *
 * Estos claims viven en `app_metadata` y se leen en RLS con:
 *   auth.jwt() -> 'app_metadata' ->> 'empresa_id'
 */
export interface SviAppMetadata {
  empresa_id: string;
  rol: Rol;
  sucursales: string[]; // UUIDs de sucursales asignadas
  es_principal_sucursal?: string; // UUID de sucursal default
}

export interface SviJwtPayload {
  sub: string; // user_id
  email?: string;
  app_metadata: SviAppMetadata;
  user_metadata?: Record<string, unknown>;
  aud: string;
  exp: number;
  iat: number;
}

/** Type guard para validar payload del JWT en runtime */
export function isSviJwt(payload: unknown): payload is SviJwtPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (typeof p.sub !== "string") return false;
  const meta = p.app_metadata as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") return false;
  return typeof meta.empresa_id === "string" && typeof meta.rol === "string";
}
