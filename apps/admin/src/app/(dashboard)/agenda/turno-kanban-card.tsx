"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, X, UserCheck, UserX, Loader2,
  MapPin, Video, Phone, Clock, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoTurno } from "@/modules/agenda/actions";
import type { Turno } from "@/modules/agenda/schemas";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFechaCorta(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const hora = d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay(d, hoy)) return `Hoy ${hora}`;
  if (sameDay(d, manana)) return `Mañana ${hora}`;
  return (
    d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) +
    " " +
    hora
  );
}

const MODALIDAD_ICON = {
  presencial: MapPin,
  videollamada: Video,
  telefono: Phone,
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function TurnoKanbanCard({ turno }: { turno: Turno }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const esPasado = new Date(turno.inicio) < new Date();
  const ModalidadIcon = MODALIDAD_ICON[turno.modalidad];

  function aplicar(estado: "confirmado" | "cumplido" | "cancelado" | "no_show") {
    startTransition(async () => {
      const res = await cambiarEstadoTurno({ id: turno.id, estado });
      if (res.ok) {
        toast.success(
          estado === "confirmado" ? "Turno confirmado" :
          estado === "cumplido"   ? "Marcado como cumplido" :
          estado === "no_show"    ? "Marcado como no-show" :
                                    "Turno cancelado",
        );
        router.refresh();
        setConfirmCancel(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      className={`rounded-xl border bg-svi-card p-3 space-y-2.5 transition ${
        esPasado && turno.estado === "solicitado"
          ? "border-svi-warning/40"
          : "border-svi-border-muted"
      }`}
    >
      {/* Persona + link detalle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-svi-white truncate">
            {turno.persona_label ??
              turno.externo_nombre ??
              `${turno.persona_tipo} sin nombre`}
          </p>
          {turno.recurso_nombre && (
            <p className="text-xs text-svi-muted-2 flex items-center gap-1 mt-0.5">
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: turno.recurso_color ?? "#C5A059" }}
              />
              {turno.recurso_nombre}
            </p>
          )}
        </div>
        <Link
          href={`/agenda/turnos/${turno.id}`}
          className="shrink-0 text-svi-muted-2 hover:text-svi-white transition"
          title="Ver detalle"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Fecha + modalidad + motivo */}
      <div className="space-y-1">
        <p
          className={`text-xs flex items-center gap-1 ${
            esPasado && turno.estado === "solicitado"
              ? "text-svi-warning"
              : "text-svi-muted"
          }`}
        >
          <Clock className="size-3 shrink-0" />
          {formatFechaCorta(turno.inicio)}
          {esPasado && turno.estado === "solicitado" && (
            <span className="ml-1 font-medium">· Vencido</span>
          )}
        </p>
        <p className="text-xs text-svi-muted flex items-center gap-1">
          <ModalidadIcon className="size-3 shrink-0" />
          <span className="truncate">{turno.motivo}</span>
        </p>
      </div>

      {/* Acciones */}
      {!confirmCancel ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {(turno.estado === "solicitado" || turno.estado === "confirmado") && (
            <>
              {turno.estado === "solicitado" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => aplicar("confirmado")}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-svi-success/10 text-svi-success border border-svi-success/30 hover:bg-svi-success/20 transition disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Confirmar
                </button>
              )}
              {turno.estado === "confirmado" && (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => aplicar("cumplido")}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-svi-info/10 text-svi-info border border-svi-info/30 hover:bg-svi-info/20 transition disabled:opacity-50"
                  >
                    {pending ? <Loader2 className="size-3 animate-spin" /> : <UserCheck className="size-3" />}
                    Cumplido
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => aplicar("no_show")}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-svi-warning/10 text-svi-warning border border-svi-warning/30 hover:bg-svi-warning/20 transition disabled:opacity-50"
                  >
                    {pending ? <Loader2 className="size-3 animate-spin" /> : <UserX className="size-3" />}
                    No-show
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-svi-error/10 text-svi-error border border-svi-error/30 hover:bg-svi-error/20 transition disabled:opacity-50"
              >
                <X className="size-3" />
                Cancelar
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-xs text-svi-error">¿Cancelar?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => aplicar("cancelado")}
            className="text-xs px-2 py-1 rounded-md bg-svi-error text-white font-medium disabled:opacity-50 inline-flex items-center gap-1"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Sí
          </button>
          <button
            type="button"
            onClick={() => setConfirmCancel(false)}
            className="text-xs px-2 py-1 rounded-md border border-svi-border-muted text-svi-muted hover:text-svi-white"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
