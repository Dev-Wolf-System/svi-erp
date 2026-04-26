import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para Server Components, Route Handlers y Server Actions.
 * Necesita un objeto-cookies provisto por la app (Next.js cookies()).
 * Esto evita el acoplamiento directo con next/headers desde el package.
 */
export interface CookieStore {
  get(name: string): { value: string } | undefined;
  set?(name: string, value: string, options?: CookieOptions): void;
}

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export function createSupabaseServerClient(cookies: CookieStore): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        // Implementación mínima compatible — cada app puede sobreescribir si necesita.
        return [];
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set?.(name, value, options);
          });
        } catch {
          // Server Components no pueden setear cookies — el middleware se encarga.
        }
      },
    },
  });
}

/** Cliente con service role — solo para operaciones server-side privilegiadas (jobs, seeders) */
export function createSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (¡no exponer al cliente!)",
    );
  }
  // createServerClient sin cookies funciona como cliente service-role
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
