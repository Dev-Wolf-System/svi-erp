import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, Settings2, LayoutGrid } from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { getRecursos, getTurnosRango } from "@/modules/agenda/queries";
import { CalendarioSemanal } from "./calendario-semanal";
import { KanbanTurnos } from "./kanban-turnos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agenda · SVI",
};

function startOfWeek(d: Date): Date {
  // Lunes como primer día (estándar AR), domingo último.
  const day = d.getDay(); // 0=domingo
  const offset = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setDate(d.getDate() + offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ semana?: string; recurso?: string; vista?: string }>;
}) {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const puedeCrearTurno = can("agenda.crear_turno", claims.rol);
  const puedeGestionar = can("agenda.gestionar_turno", claims.rol);
  const esVendedor = claims.rol === "vendedor";

  const sp = (await searchParams) ?? {};
  const semanaIso = sp.semana;
  const recursoFiltro = sp.recurso;
  const vista = sp.vista === "calendario" ? "calendario" : "kanban";

  const lunes = semanaIso ? startOfWeek(new Date(semanaIso)) : startOfWeek(new Date());
  const domingo = addDays(lunes, 7);

  const [recursos, turnos] = await Promise.all([
    getRecursos({ soloActivos: true }),
    getTurnosRango({
      desde: lunes.toISOString(),
      hasta: domingo.toISOString(),
      ...(recursoFiltro ? { recurso_id: recursoFiltro } : {}),
    }),
  ]);

  const lunesAnterior = addDays(lunes, -7).toISOString().slice(0, 10);
  const lunesSiguiente = addDays(lunes, 7).toISOString().slice(0, 10);
  const hoyParam = startOfWeek(new Date()).toISOString().slice(0, 10);

  // Helpers para construir URLs preservando todos los params actuales
  function withParam(key: string, value: string) {
    const base = new URLSearchParams({
      ...(semanaIso ? { semana: semanaIso } : {}),
      ...(recursoFiltro ? { recurso: recursoFiltro } : {}),
      vista,
    });
    base.set(key, value);
    return `/agenda?${base.toString()}`;
  }

  return (
    <div className="container max-w-[1400px] py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-svi-gold">
            Operación
          </p>
          <h1 className="text-3xl font-display tracking-tight text-svi-white">
            Agenda
          </h1>
          <p className="text-sm text-svi-muted">
            Turnos de {recursos.length === 1 ? "1 recurso" : `${recursos.length} recursos`} ·{" "}
            {turnos.length} en la semana visible
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle vista */}
          <div className="flex rounded-lg border border-svi-border-muted overflow-hidden">
            <Link
              href={withParam("vista", "kanban")}
              className={`text-xs px-3 py-1.5 inline-flex items-center gap-1.5 transition ${
                vista === "kanban"
                  ? "bg-svi-gold text-svi-black font-medium"
                  : "text-svi-muted hover:text-svi-white hover:bg-svi-elevated"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Kanban
            </Link>
            <Link
              href={withParam("vista", "calendario")}
              className={`text-xs px-3 py-1.5 inline-flex items-center gap-1.5 transition border-l border-svi-border-muted ${
                vista === "calendario"
                  ? "bg-svi-gold text-svi-black font-medium"
                  : "text-svi-muted hover:text-svi-white hover:bg-svi-elevated"
              }`}
            >
              <CalendarDays className="size-3.5" />
              Calendario
            </Link>
          </div>

          <Link
            href={withParam("semana", hoyParam)}
            className="text-xs px-3 py-1.5 rounded-md border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition"
          >
            Hoy
          </Link>
          <Link
            href={withParam("semana", lunesAnterior)}
            className="text-xs px-3 py-1.5 rounded-md border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition"
          >
            ← Anterior
          </Link>
          <Link
            href={withParam("semana", lunesSiguiente)}
            className="text-xs px-3 py-1.5 rounded-md border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition"
          >
            Siguiente →
          </Link>
          {puedeGestionar && (
            <Link
              href="/agenda/recursos"
              className="text-xs px-3 py-1.5 rounded-md border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition inline-flex items-center gap-1.5"
            >
              <Settings2 className="size-3.5" />
              Recursos
            </Link>
          )}
          {puedeCrearTurno && (
            <Link
              href="/agenda/turnos/nuevo"
              className="text-xs px-3 py-1.5 rounded-md bg-svi-gold text-svi-black hover:opacity-90 transition inline-flex items-center gap-1.5 font-medium"
            >
              <Plus className="size-3.5" />
              Nuevo turno
            </Link>
          )}
        </div>
      </header>

      {recursos.length > 0 && !esVendedor && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-svi-muted-2 font-mono uppercase tracking-wider">
            Filtrar por recurso:
          </span>
          <Link
            href={`/agenda?vista=${vista}${semanaIso ? `&semana=${semanaIso}` : ""}`}
            className={`px-3 py-1 rounded-full border transition ${
              !recursoFiltro
                ? "border-svi-gold bg-svi-gold/10 text-svi-gold"
                : "border-svi-border-muted text-svi-muted hover:text-svi-white"
            }`}
          >
            Todos
          </Link>
          {recursos.map((r) => (
            <Link
              key={r.id}
              href={withParam("recurso", r.id)}
              className={`px-3 py-1 rounded-full border transition flex items-center gap-1.5 ${
                recursoFiltro === r.id
                  ? "bg-svi-elevated text-svi-white"
                  : "border-svi-border-muted text-svi-muted hover:text-svi-white"
              }`}
              style={recursoFiltro === r.id ? { borderColor: r.color } : undefined}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              {r.nombre}
            </Link>
          ))}
        </div>
      )}

      {recursos.length === 0 ? (
        <EmptyRecursos />
      ) : vista === "calendario" ? (
        <CalendarioSemanal lunes={lunes.toISOString()} turnos={turnos} />
      ) : (
        <KanbanTurnos turnos={turnos} recursos={recursos} puedeGestionar={puedeGestionar} />
      )}
    </div>
  );
}

function EmptyRecursos() {
  return (
    <div className="rounded-xl border border-dashed border-svi-border-muted p-10 flex flex-col items-center justify-center gap-3 text-center">
      <CalendarDays className="size-10 text-svi-muted-2" />
      <h3 className="font-display text-svi-white">No hay recursos cargados</h3>
      <p className="text-sm text-svi-muted max-w-md">
        Antes de crear turnos, agregá recursos (owner, asesor, vendedor o salas)
        con su disponibilidad horaria.
      </p>
      <Link
        href="/agenda/recursos/nuevo"
        className="mt-2 px-4 py-2 rounded-lg bg-svi-gold text-svi-black hover:opacity-90 transition text-sm font-medium inline-flex items-center gap-1.5"
      >
        <Plus className="size-4" />
        Crear primer recurso
      </Link>
    </div>
  );
}
