import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { SUCURSALES_SEED } from "@repo/config/constants";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMeta = (user?.app_metadata ?? {}) as { rol?: string };

  // Sucursales del usuario — placeholder hasta cablear con Supabase real.
  // Cuando esté la DB, reemplazar por query real filtrada por empresa_id del JWT.
  const sucursales = SUCURSALES_SEED.map((s, i) => ({
    id: `00000000-0000-0000-0000-00000000001${i}`,
    nombre: s.nombre,
    codigo: s.codigo,
  }));

  return (
    <div className="min-h-screen flex bg-svi-black">
      <Sidebar rol={appMeta.rol} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            email: user?.email ?? "demo@svi.com.ar",
            nombre: user?.user_metadata?.nombre ?? "Demo",
            rol: appMeta.rol ?? "admin",
          }}
          sucursales={sucursales}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
