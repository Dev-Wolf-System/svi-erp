"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { reprogramarTurno } from "@/modules/agenda/actions";
import type { Turno } from "@/modules/agenda/schemas";

const HORA_INICIO = 7;
const HORA_FIN = 22;
const ROW_HEIGHT_PX = 56;
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

// ─── CalendarioSemanal ───────────────────────────────────────────────────────

export function CalendarioSemanal({
  lunes,
  turnos,
}: {
  lunes: string;
  turnos: Turno[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTurno, setActiveTurno] = useState<Turno | null>(null);
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, { inicio: string; fin: string }>
  >(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Merge turnos with optimistic overrides for instant visual feedback
  const effectiveTurnos = useMemo(() => {
    if (optimisticOverrides.size === 0) return turnos;
    return turnos.map((t) => {
      const ov = optimisticOverrides.get(t.id);
      return ov ? { ...t, ...ov } : t;
    });
  }, [turnos, optimisticOverrides]);

  const lunesDate = useMemo(() => new Date(lunes), [lunes]);

  const dias = useMemo(() => {
    const hoyIso = new Date().toISOString().slice(0, 10);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunesDate);
      d.setDate(lunesDate.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return {
        iso,
        label: DIAS_SEMANA[i] ?? "",
        numero: d.getDate(),
        esHoy: iso === hoyIso,
      };
    });
  }, [lunesDate]);

  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of effectiveTurnos) {
      const dia = new Date(t.inicio).toISOString().slice(0, 10);
      const arr = map.get(dia) ?? [];
      arr.push(t);
      map.set(dia, arr);
    }
    return map;
  }, [effectiveTurnos]);

  const horasFila = useMemo(() => {
    const arr: number[] = [];
    for (let h = HORA_INICIO; h < HORA_FIN; h++) arr.push(h);
    return arr;
  }, []);

  const totalHeight = (HORA_FIN - HORA_INICIO) * ROW_HEIGHT_PX;

  function handleDragStart(event: DragStartEvent) {
    setActiveTurno((event.active.data.current?.turno as Turno) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTurno(null);
    const { active, over, delta } = event;
    if (!over) return;

    const turno = active.data.current?.turno as Turno | undefined;
    if (!turno) return;

    const targetDayIso = over.id as string;
    const inicio = new Date(turno.inicio);
    const duracionMs = new Date(turno.fin).getTime() - inicio.getTime();

    // Compute new start time: original local time + vertical drag delta, snapped to 15 min
    const originalMins = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
    const deltaMins = Math.round(((delta.y / ROW_HEIGHT_PX) * 60) / 15) * 15;
    const maxMins = (HORA_FIN - HORA_INICIO) * 60 - Math.ceil(duracionMs / 60000);
    const newMins = Math.max(0, Math.min(originalMins + deltaMins, maxMins));

    const newH = HORA_INICIO + Math.floor(newMins / 60);
    const newM = newMins % 60;

    // Build as local-time string then convert to UTC ISO (matching the form's toISOString() approach)
    const newInicioLocal = `${targetDayIso}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:00`;
    const newInicio = new Date(newInicioLocal).toISOString();
    const newFin = new Date(new Date(newInicioLocal).getTime() + duracionMs).toISOString();

    // Skip if no real change
    if (newInicio === turno.inicio) return;

    // Optimistic update for instant visual feedback
    setOptimisticOverrides((prev) => new Map(prev).set(turno.id, { inicio: newInicio, fin: newFin }));

    startTransition(async () => {
      const res = await reprogramarTurno({ id: turno.id, inicio: newInicio, fin: newFin });
      if (res.ok) {
        toast.success("Turno reprogramado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
      setOptimisticOverrides((prev) => {
        const next = new Map(prev);
        next.delete(turno.id);
        return next;
      });
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
        {/* Header con días */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-svi-border-muted">
          <div className="bg-svi-elevated" />
          {dias.map((d) => (
            <div
              key={d.iso}
              className={`px-3 py-3 text-center border-l border-svi-border-muted ${
                d.esHoy ? "bg-svi-gold/10" : "bg-svi-elevated"
              }`}
            >
              <p className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
                {d.label}
              </p>
              <p
                className={`text-2xl font-display ${
                  d.esHoy ? "text-svi-gold" : "text-svi-white"
                }`}
              >
                {d.numero}
              </p>
            </div>
          ))}
        </div>

        {/* Grilla */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] relative">
          {/* Columna de horas */}
          <div className="border-r border-svi-border-muted">
            {horasFila.map((h) => (
              <div
                key={h}
                style={{ height: `${ROW_HEIGHT_PX}px` }}
                className="border-b border-svi-border-muted px-2 pt-1 text-[10px] font-mono text-svi-muted-2"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Columnas de días (droppable) */}
          {dias.map((d) => (
            <DayColumn
              key={d.iso}
              dia={d}
              turnos={turnosPorDia.get(d.iso) ?? []}
              horasFila={horasFila}
              totalHeight={totalHeight}
              activeTurnoId={activeTurno?.id ?? null}
            />
          ))}
        </div>

        <p className="text-[10px] text-svi-muted-2 px-3 py-2 border-t border-svi-border-muted bg-svi-elevated/50">
          {HORA_INICIO}:00–{HORA_FIN}:00 · Click para ver detalle · Arrastrá para reprogramar
        </p>
      </div>

      {/* Overlay mientras se arrastra */}
      <DragOverlay dropAnimation={null}>
        {activeTurno ? <TurnoBlockOverlay turno={activeTurno} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── DayColumn (droppable) ───────────────────────────────────────────────────

function DayColumn({
  dia,
  turnos,
  horasFila,
  totalHeight,
  activeTurnoId,
}: {
  dia: { iso: string; label: string; numero: number; esHoy: boolean };
  turnos: Turno[];
  horasFila: number[];
  totalHeight: number;
  activeTurnoId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dia.iso });

  return (
    <div
      ref={setNodeRef}
      className={`border-l border-svi-border-muted relative transition-colors duration-100 ${
        isOver && activeTurnoId ? "bg-svi-gold/5" : ""
      }`}
      style={{ height: `${totalHeight}px` }}
    >
      {horasFila.map((h) => (
        <div
          key={h}
          style={{ height: `${ROW_HEIGHT_PX}px` }}
          className="border-b border-svi-border-muted/40"
        />
      ))}
      {turnos.map((t) => (
        <TurnoBlock key={t.id} turno={t} />
      ))}
    </div>
  );
}

// ─── TurnoBlock (draggable) ──────────────────────────────────────────────────

function TurnoBlock({ turno }: { turno: Turno }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: turno.id,
    data: { turno },
  });

  const inicio = new Date(turno.inicio);
  const fin = new Date(turno.fin);
  const minutosDesde = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
  const duracionMin = (fin.getTime() - inicio.getTime()) / 60000;
  const top = (minutosDesde / 60) * ROW_HEIGHT_PX;
  const height = Math.max((duracionMin / 60) * ROW_HEIGHT_PX, 24);

  if (top < 0 || top >= (HORA_FIN - HORA_INICIO) * ROW_HEIGHT_PX) return null;

  const color = turno.recurso_color ?? "#C5A059";
  const dim = turno.estado === "cancelado" || turno.estado === "no_show";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="absolute left-1 right-1 touch-none cursor-grab active:cursor-grabbing"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 0 : 1,
      }}
    >
      <Link
        href={`/agenda/turnos/${turno.id}`}
        draggable={false}
        className="block h-full rounded-md px-2 py-1 text-[11px] overflow-hidden hover:shadow-lg transition group"
        style={{
          backgroundColor: dim ? "transparent" : `${color}1A`,
          borderLeft: `3px solid ${color}`,
          opacity: dim ? 0.55 : 1,
        }}
        title={`${turno.persona_label ?? ""} — ${turno.motivo} (${turno.estado})`}
      >
        <p className="font-mono text-[10px] text-svi-muted-2 leading-tight">
          {fmt(inicio)}–{fmt(fin)}
        </p>
        <p className="text-svi-white font-medium truncate leading-tight">
          {turno.persona_label ?? "—"}
        </p>
        <p className="text-svi-muted truncate leading-tight">{turno.motivo}</p>
        <EstadoTag estado={turno.estado} />
      </Link>
    </div>
  );
}

// ─── TurnoBlockOverlay ───────────────────────────────────────────────────────

function TurnoBlockOverlay({ turno }: { turno: Turno }) {
  const inicio = new Date(turno.inicio);
  const fin = new Date(turno.fin);
  const duracionMin = (fin.getTime() - inicio.getTime()) / 60000;
  const height = Math.max((duracionMin / 60) * ROW_HEIGHT_PX, 24);
  const color = turno.recurso_color ?? "#C5A059";

  return (
    <div
      className="rounded-md px-2 py-1 text-[11px] overflow-hidden shadow-2xl ring-2 ring-svi-gold/40 cursor-grabbing"
      style={{
        height: `${height}px`,
        width: "100%",
        backgroundColor: `${color}2A`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <p className="font-mono text-[10px] text-svi-muted-2 leading-tight">
        {fmt(inicio)}–{fmt(fin)}
      </p>
      <p className="text-svi-white font-medium truncate leading-tight">
        {turno.persona_label ?? "—"}
      </p>
      <p className="text-svi-muted truncate leading-tight">{turno.motivo}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function EstadoTag({ estado }: { estado: Turno["estado"] }) {
  const meta: Record<Turno["estado"], { label: string; cls: string }> = {
    solicitado: { label: "Solicitado", cls: "bg-svi-warning/20 text-svi-warning" },
    confirmado: { label: "Confirmado", cls: "bg-svi-success/20 text-svi-success" },
    cumplido: { label: "Cumplido", cls: "bg-svi-info/20 text-svi-info" },
    cancelado: { label: "Cancelado", cls: "bg-svi-error/20 text-svi-error" },
    no_show: { label: "No-show", cls: "bg-svi-error/20 text-svi-error" },
  };
  const m = meta[estado];
  return (
    <span
      className={`absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
