import type { Turno } from "@/modules/agenda/schemas";
import { TurnoKanbanCard } from "./turno-kanban-card";

const COLUMNAS = [
  {
    estado: "solicitado",
    label: "Solicitado",
    color: "text-svi-warning",
    border: "border-svi-warning/30",
    bg: "bg-svi-warning/5",
  },
  {
    estado: "confirmado",
    label: "Confirmado",
    color: "text-svi-info",
    border: "border-svi-info/30",
    bg: "bg-svi-info/5",
  },
  {
    estado: "cumplido",
    label: "Cumplido",
    color: "text-svi-success",
    border: "border-svi-success/30",
    bg: "bg-svi-success/5",
  },
  {
    estado: "cancelado_no_show",
    label: "Cancelado / No-show",
    color: "text-svi-error",
    border: "border-svi-error/30",
    bg: "bg-svi-error/5",
  },
] as const;

interface Props {
  turnos: Turno[];
}

export function KanbanTurnos({ turnos }: Props) {
  const byEstado: Record<string, Turno[]> = {
    solicitado: [],
    confirmado: [],
    cumplido: [],
    cancelado_no_show: [],
  };

  for (const t of turnos) {
    if (t.estado === "cancelado" || t.estado === "no_show") {
      (byEstado["cancelado_no_show"] as Turno[]).push(t);
    } else {
      byEstado[t.estado]?.push(t);
    }
  }

  // Ordenar cada columna por fecha de inicio ascendente
  for (const key of Object.keys(byEstado)) {
    (byEstado[key] as Turno[]).sort((a, b) => a.inicio.localeCompare(b.inicio));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNAS.map((col) => {
        const items = byEstado[col.estado] ?? [];
        return (
          <div key={col.estado} className="flex flex-col gap-2 min-h-[200px]">
            {/* Header columna */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${col.border} ${col.bg}`}
            >
              <span className={`text-xs font-mono uppercase tracking-widest font-semibold ${col.color}`}>
                {col.label}
              </span>
              <span
                className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${col.bg} ${col.color} border ${col.border}`}
              >
                {items.length}
              </span>
            </div>

            {/* Cards */}
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-svi-border-muted/50 p-6">
                <p className="text-xs text-svi-muted-2 text-center">Sin turnos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((t) => (
                  <TurnoKanbanCard key={t.id} turno={t} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
