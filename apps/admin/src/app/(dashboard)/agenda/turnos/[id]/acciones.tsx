"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoTurno, type Turno, type TurnoEstado } from "@/modules/agenda";

const ACCIONES: {
  key: TurnoEstado;
  label: string;
  Icon: typeof Check;
  cls: string;
  onlyFrom: TurnoEstado[];
}[] = [
  {
    key: "confirmado",
    label: "Confirmar",
    Icon: Check,
    cls: "bg-svi-success/10 text-svi-success border-svi-success/40 hover:bg-svi-success/20",
    onlyFrom: ["solicitado"],
  },
  {
    key: "cumplido",
    label: "Marcar cumplido",
    Icon: UserCheck,
    cls: "bg-svi-info/10 text-svi-info border-svi-info/40 hover:bg-svi-info/20",
    onlyFrom: ["confirmado", "solicitado"],
  },
  {
    key: "no_show",
    label: "No-show",
    Icon: UserX,
    cls: "bg-svi-error/10 text-svi-error border-svi-error/40 hover:bg-svi-error/20",
    onlyFrom: ["confirmado", "solicitado"],
  },
  {
    key: "cancelado",
    label: "Cancelar",
    Icon: X,
    cls: "bg-svi-error/10 text-svi-error border-svi-error/40 hover:bg-svi-error/20",
    onlyFrom: ["solicitado", "confirmado"],
  },
];

export function TurnoAcciones({ turno }: { turno: Turno }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCancelar, setShowCancelar] = useState(false);
  const [motivo, setMotivo] = useState("");

  function aplicar(estado: TurnoEstado, motivoCancelacion?: string) {
    startTransition(async () => {
      const res = await cambiarEstadoTurno({
        id: turno.id,
        estado,
        cancelado_motivo: motivoCancelacion,
      });
      if (res.ok) {
        toast.success(`Turno ${estado.replace("_", " ")}`);
        router.refresh();
        setShowCancelar(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const disponibles = ACCIONES.filter((a) => a.onlyFrom.includes(turno.estado));

  if (disponibles.length === 0) {
    return (
      <p className="text-sm text-svi-muted-2 text-center py-4">
        No hay acciones disponibles para un turno en estado{" "}
        <span className="font-mono">{turno.estado}</span>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono uppercase tracking-widest text-svi-muted-2">
        Acciones
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {disponibles.map((a) => {
          const Icon = a.Icon;
          return (
            <button
              key={a.key}
              type="button"
              disabled={pending}
              onClick={() => {
                if (a.key === "cancelado") setShowCancelar(true);
                else aplicar(a.key);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition disabled:opacity-50 ${a.cls}`}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
              {a.label}
            </button>
          );
        })}
      </div>

      {showCancelar && (
        <div className="p-3 rounded-lg bg-svi-error/5 border border-svi-error/20 space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
            Motivo de cancelación
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Cliente reagendó, no podía asistir, etc."
            maxLength={200}
            className="w-full px-3 py-2 rounded-md bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-error focus:outline-none placeholder:text-svi-muted-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCancelar(false)}
              className="text-xs px-3 py-1.5 text-svi-muted hover:text-svi-white"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => aplicar("cancelado", motivo.trim() || undefined)}
              className="text-xs px-3 py-1.5 rounded-md bg-svi-error text-svi-white font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {pending && <Loader2 className="size-3 animate-spin" />}
              Confirmar cancelación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
