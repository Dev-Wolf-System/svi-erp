import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageSquare, Settings2, ChevronRight } from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configuración · SVI",
};

const SECTIONS = [
  {
    group: "Integraciones",
    items: [
      {
        href: "/configuracion/integraciones/whatsapp",
        label: "WhatsApp · Evolution API",
        description:
          "Conectar / regenerar QR del WhatsApp del owner para notificaciones y agente IA.",
        icon: MessageSquare,
        permission: "config.integraciones",
      },
    ],
  },
] as const;

export default async function ConfiguracionPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("config.view", claims.rol)) notFound();

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-svi-muted-2">
          Sistema
        </p>
        <h1 className="text-3xl font-display tracking-tight text-svi-white">
          Configuración
        </h1>
        <p className="text-sm text-svi-muted">
          Ajustes de integraciones, automatizaciones y parámetros del sistema.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.group} className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-svi-muted-2">
            {section.group}
          </h2>
          <ul className="space-y-2">
            {section.items
              .filter((item) =>
                can(
                  item.permission as Parameters<typeof can>[0],
                  claims.rol,
                ),
              )
              .map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-svi-border-muted bg-svi-card hover:bg-svi-elevated hover:border-svi-gold/40 transition"
                    >
                      <div className="size-10 rounded-lg bg-svi-gold/10 flex items-center justify-center">
                        <Icon className="size-5 text-svi-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-svi-white">
                          {item.label}
                        </p>
                        <p className="text-sm text-svi-muted">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-svi-muted-2 group-hover:text-svi-gold transition" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-svi-muted-2 pt-4 flex items-center gap-1.5">
        <Settings2 className="size-3.5" />
        Más secciones de configuración se agregan aquí cuando se sumen módulos.
      </p>
    </div>
  );
}
