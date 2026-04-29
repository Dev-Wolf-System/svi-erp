"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import {
  pagarLiquidacion,
  anularLiquidacion,
} from "@/modules/liquidaciones-inversion/actions";
import {
  METODOS_PAGO,
  LABEL_METODO_PAGO,
  type MetodoPago,
} from "@/modules/liquidaciones-inversion/schemas";
import type { LiquidacionListRow } from "@/modules/liquidaciones-inversion/queries";

export function LiquidacionRowActions({
  liquidacion: l,
}: {
  liquidacion: LiquidacionListRow;
}) {
  const [pagarOpen, setPagarOpen] = useState(false);
  const [anularConfirming, setAnularConfirming] = useState(false);
  const [pendingAction, startTransition] = useTransition();

  if (l.estado === "anulada") {
    return <span className="text-xs text-svi-disabled">—</span>;
  }

  if (l.estado === "pagada") {
    return l.comprobante_url ? (
      <a
        href={l.comprobante_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-svi-gold hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Comprobante
      </a>
    ) : (
      <span className="text-xs text-svi-success">✓ Pagada</span>
    );
  }

  // estado = pendiente
  if (pagarOpen) {
    return (
      <PagarInline
        id={l.id}
        onClose={() => setPagarOpen(false)}
        pending={pendingAction}
        onSubmit={(data) => {
          startTransition(async () => {
            const res = await pagarLiquidacion({
              id: l.id,
              metodo_pago: data.metodo,
              fecha_pago: data.fecha,
              comprobante_url: data.comprobante,
            });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Liquidación marcada como pagada");
              setPagarOpen(false);
            }
          });
        }}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => setPagarOpen(true)}
        className="inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] text-svi-success hover:bg-svi-success/10"
        aria-label="Marcar pagada"
      >
        <Check className="h-3 w-3" />
        Pagar
      </button>
      <button
        onClick={() => {
          if (!anularConfirming) {
            setAnularConfirming(true);
            setTimeout(() => setAnularConfirming(false), 4000);
            return;
          }
          const motivo = prompt("Motivo de anulación:");
          if (!motivo || motivo.trim().length < 3) {
            toast.error("Motivo requerido (mínimo 3 caracteres)");
            return;
          }
          startTransition(async () => {
            const res = await anularLiquidacion({ id: l.id, motivo: motivo.trim() });
            if (!res.ok) toast.error(res.error);
            else toast.success("Liquidación anulada");
            setAnularConfirming(false);
          });
        }}
        className={`inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] ${
          anularConfirming
            ? "bg-svi-error/15 text-svi-error"
            : "text-svi-muted-2 hover:bg-svi-elevated hover:text-svi-error"
        }`}
        disabled={pendingAction}
        aria-label="Anular"
      >
        {pendingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        {anularConfirming ? "Confirmar" : "Anular"}
      </button>
    </div>
  );
}

function PagarInline({
  onClose,
  pending,
  onSubmit,
}: {
  id: string;
  onClose: () => void;
  pending: boolean;
  onSubmit: (data: {
    metodo: MetodoPago;
    fecha: string;
    comprobante: string;
  }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [fecha, setFecha] = useState<string>(today);
  const [comprobante, setComprobante] = useState<string>("");

  return (
    <div className="rounded-md border border-svi-gold/40 bg-svi-gold/5 p-2 space-y-2 max-w-sm">
      <div className="flex items-center gap-2">
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPago)}
          className="h-7 flex-1 rounded border border-svi-border-muted bg-svi-dark px-2 text-[11px] text-svi-white focus:border-svi-gold focus:outline-none"
        >
          {METODOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {LABEL_METODO_PAGO[m]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-7 rounded border border-svi-border-muted bg-svi-dark px-2 text-[11px] text-svi-white focus:border-svi-gold focus:outline-none font-mono"
        />
      </div>
      <input
        type="url"
        value={comprobante}
        onChange={(e) => setComprobante(e.target.value)}
        placeholder="URL del comprobante (opcional)"
        className="w-full h-7 rounded border border-svi-border-muted bg-svi-dark px-2 text-[11px] text-svi-white focus:border-svi-gold focus:outline-none"
      />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => onSubmit({ metodo, fecha, comprobante })}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Confirmar pago
        </Button>
      </div>
    </div>
  );
}
