"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { toast, Toaster } from "sonner";
import { cn } from "@repo/utils";
import {
  ESTADO_LABELS,
  LEAD_ESTADOS,
  type LeadEstado,
} from "@/modules/leads/schemas";
import type { LeadRow, LeadsByEstado } from "@/modules/leads/queries";
import { updateLeadEstado } from "@/modules/leads/actions";
import { LeadCard } from "./lead-card";

const ESTADO_THEME: Record<
  LeadEstado,
  { ring: string; dot: string; pill: string }
> = {
  nuevo: {
    ring: "border-svi-gold/30",
    dot: "bg-svi-gold",
    pill: "bg-svi-gold/10 text-svi-gold",
  },
  contactado: {
    ring: "border-blue-500/30",
    dot: "bg-blue-400",
    pill: "bg-blue-500/10 text-blue-300",
  },
  calificado: {
    ring: "border-purple-500/30",
    dot: "bg-purple-400",
    pill: "bg-purple-500/10 text-purple-300",
  },
  oportunidad: {
    ring: "border-svi-gold/40",
    dot: "bg-amber-400",
    pill: "bg-amber-500/10 text-amber-300",
  },
  ganado: {
    ring: "border-svi-success/40",
    dot: "bg-svi-success",
    pill: "bg-svi-success/10 text-svi-success",
  },
  perdido: {
    ring: "border-svi-error/30",
    dot: "bg-svi-error",
    pill: "bg-svi-error/10 text-svi-error",
  },
};

export function KanbanBoard({ initial }: { initial: LeadsByEstado }) {
  const [board, setBoard] = useState<LeadsByEstado>(initial);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function findLead(id: string): { lead: LeadRow; estado: LeadEstado } | null {
    for (const estado of LEAD_ESTADOS) {
      const lead = board[estado].find((l) => l.id === id);
      if (lead) return { lead, estado };
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const found = findLead(String(e.active.id));
    if (found) setActiveLead(found.lead);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    if (!e.over) return;

    const leadId = String(e.active.id);
    const destino = String(e.over.id) as LeadEstado;
    if (!LEAD_ESTADOS.includes(destino)) return;

    const found = findLead(leadId);
    if (!found || found.estado === destino) return;

    // Optimistic update
    const prev = board;
    const moved: LeadRow = { ...found.lead, estado: destino, updated_at: new Date().toISOString() };
    setBoard({
      ...board,
      [found.estado]: board[found.estado].filter((l) => l.id !== leadId),
      [destino]: [moved, ...board[destino]],
    });

    startTransition(async () => {
      const res = await updateLeadEstado({ id: leadId, estado: destino });
      if (!res.ok) {
        setBoard(prev);
        toast.error(res.error);
      } else {
        toast.success(`Movido a ${ESTADO_LABELS[destino]}`);
      }
    });
  }

  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
          {LEAD_ESTADOS.map((estado) => (
            <Column
              key={estado}
              estado={estado}
              leads={board[estado]}
              theme={ESTADO_THEME[estado]}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="rotate-2 opacity-90">
              <LeadCard lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function Column({
  estado,
  leads,
  theme,
}: {
  estado: LeadEstado;
  leads: LeadRow[];
  theme: (typeof ESTADO_THEME)[LeadEstado];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "snap-start shrink-0 w-[300px] rounded-xl border bg-svi-card/40 transition-colors",
        theme.ring,
        isOver && "bg-svi-elevated/60 ring-2 ring-svi-gold/30",
      )}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-svi-border-muted/50">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-svi-white">
          <span className={cn("h-2 w-2 rounded-full", theme.dot)} />
          {ESTADO_LABELS[estado]}
        </span>
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-full text-[11px] font-mono",
            theme.pill,
          )}
        >
          {leads.length}
        </span>
      </header>

      <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {leads.length === 0 ? (
          <p className="text-center text-xs text-svi-disabled py-8">
            Sin leads
          </p>
        ) : (
          leads.map((lead) => <DraggableLeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </section>
  );
}

function DraggableLeadCard({ lead }: { lead: LeadRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-opacity",
        isDragging && "opacity-30",
      )}
    >
      <LeadCard lead={lead} />
    </div>
  );
}
