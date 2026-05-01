import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getAgendaVendedores } from "@/modules/secretaria/queries";

export const metadata = { title: "Vendedores — SVI ERP" };

const ESTADO_COLORS: Record<string, string> = {
  solicitado: "text-svi-warning bg-svi-warning/10",
  confirmado: "text-svi-info bg-svi-info/10",
  cumplido: "text-svi-success bg-svi-success/10",
  cancelado: "text-svi-error bg-svi-error/10",
  no_show: "text-svi-muted bg-svi-elevated",
};

const ESTADO_LABELS: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
  no_show: "No se presentó",
};

export default async function VendedoresPage() {
  const claims = await getSviClaims();
  if (!claims || !can("agenda.view", claims.rol)) redirect("/secretaria");

  const hoy = new Date().toISOString().slice(0, 10)!;
  const en7dias = new Date();
  en7dias.setDate(en7dias.getDate() + 7);

  const vendedores = await getAgendaVendedores({
    desde: `${hoy}T00:00:00`,
    hasta: en7dias.toISOString(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-svi-white">Vendedores</h1>
        <p className="text-sm text-svi-muted mt-0.5">Agenda por vendedor — hoy y próximos 7 días</p>
      </div>

      {vendedores.length === 0 ? (
        <div className="bg-svi-card rounded-xl p-12 border border-svi-border-muted text-center">
          <CalendarDays className="h-10 w-10 text-svi-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-svi-muted">
            No hay recursos de tipo vendedor activos.{" "}
            <Link href="/agenda/recursos" className="text-svi-gold hover:underline">
              Ir a Recursos
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendedores.map((v) => (
            <div
              key={v.recurso_id}
              className="bg-svi-card rounded-xl border border-svi-border-muted overflow-hidden"
            >
              {/* Header vendedor */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-svi-border-muted">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: v.color }}
                />
                <h3 className="text-sm font-semibold text-svi-white">{v.nombre}</h3>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-xs text-svi-muted">
                    Hoy: <span className="text-svi-white font-medium">{v.turnosHoy}</span>
                  </span>
                  <span className="text-xs text-svi-muted">
                    Semana: <span className="text-svi-white font-medium">{v.turnosSemana}</span>
                  </span>
                </div>
              </div>

              {/* Turnos */}
              {v.turnos.length === 0 ? (
                <div className="px-5 py-6 flex items-center gap-2 text-svi-muted">
                  <CheckCircle2 className="h-4 w-4 opacity-40" />
                  <p className="text-xs">Sin turnos en el período</p>
                </div>
              ) : (
                <ul className="divide-y divide-svi-border-muted">
                  {v.turnos.map((t) => {
                    const fecha = new Date(t.inicio).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    const hora = new Date(t.inicio).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="text-xs text-svi-muted w-28 shrink-0">
                          <span className="capitalize">{fecha}</span>
                          {" · "}
                          <span className="text-svi-white font-medium">{hora}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-svi-white truncate">
                            {t.persona_label ?? "—"}
                          </p>
                          <p className="text-xs text-svi-muted truncate">{t.motivo}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[t.estado] ?? "text-svi-muted"}`}
                        >
                          {ESTADO_LABELS[t.estado] ?? t.estado}
                        </span>
                        <Link
                          href={`/agenda/turnos/${t.id}`}
                          className="text-xs text-svi-gold hover:underline shrink-0"
                        >
                          Ver
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
