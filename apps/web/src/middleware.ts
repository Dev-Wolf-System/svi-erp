import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Middleware de la app pública (apps/web).
 *
 * Refresca la sesión Supabase en cada request (patrón estándar @supabase/ssr)
 * y protege las rutas privadas del portal:
 *   - /portal/cliente/*   y  /portal/inversor/*  requieren sesión.
 *   - /portal y /portal/login son públicas.
 *
 * No valida si el user es realmente un cliente/inversor habilitado — eso
 * lo hace el helper getInversorSession en la propia página, que también
 * redirige al login si el lookup en `inversores` no matchea.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return response;

  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/portal/cliente") ||
    path.startsWith("/portal/inversor");

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && requiresAuth) {
    const audience = path.startsWith("/portal/inversor")
      ? "inversor"
      : "cliente";
    const loginUrl = new URL("/portal/login", request.url);
    loginUrl.searchParams.set("tipo", audience);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/portal/login") {
    // Si ya logueado, redirigir según tipo. Como acá no sabemos si es
    // inversor o cliente, mandamos a /portal y la página decide.
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)",
  ],
};
