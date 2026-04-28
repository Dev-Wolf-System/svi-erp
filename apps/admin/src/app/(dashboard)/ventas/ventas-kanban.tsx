"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { toast } from "sonner";
import { Receipt, CreditCard, FileSignature, GripVertical } from "lucide-react";
import { cn, formatCurrency, formatRelative } from "@repo/utils";
import {
  ESTADOS_VENTA,
  LABEL_ESTADO,
  COLOR_ESTADO,
  type EstadoVenta,
} from "@/modules/ventas/schemas";
import type { VentaListRow } from "@/modules/ventas/queries";
import { cambiarEstadoVenta } from "@/modules/ventas/actions";

interface Props {
  grupos: Record<EstadoVenta, VentaListRow[]>;
}

export function VentasKanban({ grupos }: Props) {
  const [board, setBoard] = useState<Record<EstadoVenta, VentaListRow[]>>(grupos);
  const [active, setActive] = useState<VentaListRow | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findVenta(id: string): { venta: VentaListRow; estado: EstadoVenta } | null {
    for (const estado of ESTADOS_VENTA) {
      const venta = board[estado].find((v) => v.id === id);
      if (venta) return { venta, estado };
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const found = findVenta(String(e.active.id));
    if (found) setActive(found.venta);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActive(null);
    if (!e.over) return;

    const ventaId = String(e.active.id);
    const destino = String(e.over.id) as EstadoVenta;
    if (!ESTADOS_VENTA.includes(destino)) return;

    const found = findVenta(ventaId);
    if (!found || found.estado === destino) return;

    if (destino === "anulado") {
      toast.info("Para anular, abrí el detalle de la venta y registrá el motivo.");
      return;
    }

    if (found.estado === "anulado") {
      toast.error("Una venta anulada no puede reactivarse desde el board.");
      return;
    }

    const prev = board;
    const moved: VentaListRow = { ...found.venta, estado: destino, updated_at: new Date().toISOString() };
    setBoard({
      ...board,
      [found.estado]: board[found.estado].filter((v) => v.id !== ventaId),
      [destino]: [moved, ...board[destino]],
    });

    startTransition(async () => {
      const res = await cambiarEstadoVenta({ id: ventaId, estado: destino });
      if (!res.ok) {
        setBoard(prev);
        toast.error(res.error);
      } else {
        const msg =
          destino === "entregado" || destino === "finalizado"
            ? `Movida a ${LABEL_ESTADO[destino]} · vehículo marcado vendido`
            : `Movida a ${LABEL_ESTADO[destino]}`;
        toast.success(msg);
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
        {ESTADOS_VENTA.map((estado) => (
          <Column
            key={estado}
            estado={estado}
            ventas={board[estado] ?? []}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="rotate-2 opacity-90 w-[260px]">
            <VentaCard venta={active} dragHandle={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ estado, ventas }: { estado: EstadoVenta; ventas: VentaListRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "snap-start shrink-0 w-[280px] h-full flex flex-col rounded-xl border bg-svi-card/30 transition-colors",
        COLOR_ESTADO[estado],
        isOver && "bg-svi-elevated/60 ring-2 ring-svi-gold/30",
      )}
    >
      <header className="shrink-0 px-3 py-2.5 border-b border-current/20 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider">
          {LABEL_ESTADO[estado]}
        </span>
        <span className="text-xs font-bold">{ventas.length}</span>
      </header>
      <ul className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">
        {ventas.length === 0 ? (
          <li className="text-center text-xs text-svi-muted-2 py-6">
            Sin operaciones
          </li>
        ) : (
          ventas.map((v) => (
            <li key={v.id}>
              <DraggableCardWrapper venta={v} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function DraggableCardWrapper({ venta }: { venta: VentaListRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: venta.id });
  return (
    <div
      ref={setNodeRef}
      className={cn("transition-opacity", isDragging && "opacity-30")}
    >
      <VentaCard venta={venta} dragHandle dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function VentaCard({
  venta,
  dragHandle,
  dragHandleProps,
}: {
  venta: VentaListRow;
  dragHandle: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const cliente =
    venta.cliente.tipo === "empresa"
      ? venta.cliente.razon_social ?? venta.cliente.nombre
      : [venta.cliente.nombre, venta.cliente.apellido].filter(Boolean).join(" ");

  return (
    <div className="relative rounded-lg border border-svi-border-muted bg-svi-dark hover:border-svi-gold transition-colors">
      {dragHandle && (
        <button
          type="button"
          {...dragHandleProps}
          className="absolute top-1.5 right-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated cursor-grab active:cursor-grabbing"
          aria-label="Arrastrar para mover"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <Link href={`/ventas/${venta.id}`} className="block p-3 pr-8">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] text-svi-gold">
            {venta.numero_operacion}
          </span>
          <span className="text-[10px] text-svi-muted-2">
            {formatRelative(venta.created_at)}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-svi-white truncate">
          {venta.vehiculo.marca} {venta.vehiculo.modelo}{" "}
          <span className="text-svi-muted-2">{venta.vehiculo.anio}</span>
        </p>
        <p className="text-xs text-svi-muted truncate">{cliente || "—"}</p>
        <p className="mt-2 text-sm font-mono text-svi-white">
          {formatCurrency(Number(venta.precio_final), venta.moneda as "ARS" | "USD")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {venta.cae && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-success/15 text-svi-success">
              <Receipt className="h-2.5 w-2.5" />
              CAE
            </span>
          )}
          {venta.mp_payment_id && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-info/15 text-svi-info">
              <CreditCard className="h-2.5 w-2.5" />
              MP
            </span>
          )}
          {venta.contrato_url && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-gold/15 text-svi-gold">
              <FileSignature className="h-2.5 w-2.5" />
              PDF
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
