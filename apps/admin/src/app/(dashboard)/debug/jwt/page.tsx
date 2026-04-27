import { createClient } from "@/lib/supabase/server";

/**
 * Página de diagnóstico — muestra el JWT del usuario actual.
 * Útil para verificar si el custom_access_token_hook está inyectando empresa_id.
 * BORRAR antes de producción.
 */
export const metadata = { title: "Debug JWT" };

export default async function DebugJwtPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { data: session } = await supabase.auth.getSession();

  // Probar query a vehículos para ver si la RLS deja pasar
  const { data: vehiculos, error: vehError, count } = await supabase
    .from("vehiculos")
    .select("id, marca, modelo", { count: "exact" })
    .limit(5);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-warning">
          Diagnóstico
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-svi-white">
          JWT del usuario actual
        </h1>
        <p className="mt-2 text-sm text-svi-muted-2">
          Si <code className="font-mono text-svi-gold">app_metadata.empresa_id</code> está vacío,
          el JWT hook NO está activo. Cerrá sesión y volvé a entrar después de activarlo.
        </p>
      </header>

      <Section title="user.id">
        <pre>{user?.id ?? "(sin sesión)"}</pre>
      </Section>

      <Section title="user.email">
        <pre>{user?.email ?? "—"}</pre>
      </Section>

      <Section title="user.app_metadata (debe tener empresa_id, rol, sucursales)">
        <pre>{JSON.stringify(user?.app_metadata, null, 2)}</pre>
      </Section>

      <Section title="user.user_metadata">
        <pre>{JSON.stringify(user?.user_metadata, null, 2)}</pre>
      </Section>

      <Section title="Errors">
        <pre>{JSON.stringify({ authError: error?.message }, null, 2)}</pre>
      </Section>

      <Section title="Test query: SELECT * FROM vehiculos LIMIT 5">
        <pre>{JSON.stringify({ count, error: vehError?.message, vehiculos }, null, 2)}</pre>
        {count === 0 && !vehError && (
          <p className="mt-3 text-svi-warning text-sm">
            ⚠ La query no devolvió filas. Causas posibles:
            <br />• El JWT hook no está activo (revisar app_metadata arriba).
            <br />• Tu usuario no está en `usuarios` con la empresa correcta.
            <br />• La empresa del JWT no coincide con la empresa_id de los vehículos.
          </p>
        )}
      </Section>

      <Section title="JWT raw (decodificar en jwt.io para inspeccionar)">
        <pre className="break-all whitespace-pre-wrap">{session?.session?.access_token ?? "—"}</pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card p-5">
      <h3 className="font-display text-sm font-semibold text-svi-gold mb-3">{title}</h3>
      <div className="font-mono text-xs text-svi-muted overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words">
        {children}
      </div>
    </div>
  );
}
