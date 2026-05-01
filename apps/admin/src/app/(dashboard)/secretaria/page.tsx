import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Video,
  Phone,
  MapPin,
} from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getDashboardDia } from "@/modules/secretaria/queries";

export const metadata = { title: "Secretaria — SVI ERP" };

const MODALIDAD_ICON = {
  presencial: MapPin,
  videollamada: Video,
  telefono: Phone,
} as const;

export default async function SecretariaPage() {
  const claims = await getSviClaims();
  if (!claims || !can("secretaria.dashboard", claims.rol)) redirect("/dashboard");

  const data = await getDashboardDia();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-svi-white">Inicio</h1>
          <p className="text-sm text-svi-muted mt-0.5">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Link
          href="/agenda/turnos/nuevo"
          className="flex items-center gap-2 bg-svi-gold text-svi-black text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Nuevo turno
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="h-5 w-5 text-svi-gold" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Turnos hoy</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.turnosHoyCount}</p>
        </div>
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-svi-warning" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Por confirmar</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.pendientesConfirmarCount}</p>
        </div>
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-svi-info" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Leads sin asignar</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.leadsSinAsignarCount}</p>
        </div>
      </div>

      {/* Próximos turnos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-svi-muted uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Próximas 3 horas
          </h2>
          <Link href="/agenda" className="text-xs text-svi-gold hover:underline">
            Ver agenda completa →
          </Link>
        </div>

        {data.turnosProximos.length === 0 ? (
          <div className="bg-svi-card rounded-xl p-8 border border-svi-border-muted text-center">
            <CheckCircle2 className="h-8 w-8 text-svi-success mx-auto mb-2 opacity-50" />
            <p className="text-sm text-svi-muted">Sin turnos en las próximas 3 horas</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.turnosProximos.map((turno) => {
              const ModalidadIcon = MODALIDAD_ICON[turno.modalidad as keyof typeof MODALIDAD_ICON] ?? MapPin;
              const hora = new Date(turno.inicio).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={turno.id}
                  className="bg-svi-card rounded-xl p-4 border border-svi-border-muted flex items-center gap-4"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: turno.recurso_color ?? "#C5A059" }}
                  />
                  <div className="text-center shrink-0 w-12">
                    <p className="text-lg font-bold text-svi-white">{hora}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-svi-white truncate">
                      {turno.persona_label ?? "—"}
                    </p>
                    <p className="text-xs text-svi-muted truncate">{turno.motivo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ModalidadIcon className="h-3.5 w-3.5 text-svi-muted" />
                    <span className="text-xs text-svi-muted">{turno.recurso_nombre}</span>
                  </div>
                  <Link
                    href={`/agenda/turnos/${turno.id}`}
                    className="text-xs text-svi-gold hover:underline shrink-0"
                  >
                    Ver
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="text-sm font-medium text-svi-muted uppercase tracking-wider font-mono mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/secretaria/asignaciones"
            className="bg-svi-card rounded-xl p-4 border border-svi-border-muted hover:border-svi-gold transition-colors flex items-center gap-3"
          >
            <Users className="h-5 w-5 text-svi-gold" />
            <div>
              <p className="text-sm font-medium text-svi-white">Asignaciones</p>
              <p className="text-xs text-svi-muted">
                {data.leadsSinAsignarCount} sin asignar
              </p>
            </div>
          </Link>
          <Link
            href="/secretaria/vendedores"
            className="bg-svi-card rounded-xl p-4 border border-svi-border-muted hover:border-svi-gold transition-colors flex items-center gap-3"
          >
            <CalendarDays className="h-5 w-5 text-svi-info" />
            <div>
              <p className="text-sm font-medium text-svi-white">Agenda vendedores</p>
              <p className="text-xs text-svi-muted">Vista por recurso</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
