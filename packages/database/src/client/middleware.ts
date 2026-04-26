import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Helper para refrescar la sesión Supabase en el middleware Next.js.
 * Devuelve { response, user } — cada app decide qué hacer con el user.
 *
 * Uso típico:
 *   export async function middleware(request: NextRequest) {
 *     const { response, user } = await updateSession(request)
 *     if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
 *       return NextResponse.redirect(new URL('/login', request.url))
 *     }
 *     return response
 *   }
 */
export async function updateSession(
  request: NextRequest,
  responseFactory: () => NextResponse,
) {
  let response = responseFactory();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = responseFactory();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
