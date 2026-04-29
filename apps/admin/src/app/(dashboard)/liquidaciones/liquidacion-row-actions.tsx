"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Loader2,
  X,
  ExternalLink,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@repo/utils";
import { Button } from "@repo/ui";
import {
  pagarLiquidacion,
  anularLiquidacion,
  getSignedReciboUrl,
} from "@/modules/liquidaciones-inversion/actions";
import {
  METODOS_PAGO,
  MODOS_PAGO_INVERSOR,
  LABEL_METODO_PAGO,
  LABEL_MODO_PAGO_INVERSOR,
  type MetodoPago,
  type ModoPagoInversor,
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
  const [pendingRecibo, startRecibo] = useTransition();

  function verRecibo() {
    startRecibo(async () => {
      const res = await getSignedReciboUrl(l.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.data.signed_url, "_blank");
    });
  }

  if (l.estado === "anulada") {
    return <span className="text-xs text-svi-disabled">—</span>;
  }

  if (l.estado === "pagada") {
    return (
      <div className="inline-flex items-center gap-2">
        {l.modo_pago_inversor === "reinvertir" ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-success/15 text-svi-success text-[10px] font-mono">
            <TrendingUp className="h-2.5 w-2.5" />
            Reinvertido
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-info/15 text-svi-info text-[10px] font-mono">
            <Wallet className="h-2.5 w-2.5" />
            Retirado
          </span>
        )}
        {l.recibo_url ? (
          <button
            onClick={verRecibo}
            disabled={pendingRecibo}
            className="inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] text-svi-gold hover:bg-svi-gold/10"
          >
            {pendingRecibo ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Receipt className="h-3 w-3" />
            )}
            Recibo
          </button>
        ) : null}
        {l.comprobante_url ? (
          <a
            href={l.comprobante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-svi-muted-2 hover:text-svi-white"
          >
            <ExternalLink className="h-3 w-3" />
            Comp.
          </a>
        ) : null}
      </div>
    );
  }

  // estado = pendiente
  if (pagarOpen) {
    return (
      <PagarInline
        onClose={() => setPagarOpen(false)}
        pending={pendingAction}
        moneda={l.moneda as "ARS" | "USD"}
        montoInteres={Number(l.monto_interes)}
        capitalActual={Number(l.capital_base)}
        onSubmit={(data) => {
          startTransition(async () => {
            const res = await pagarLiquidacion({
              id: l.id,
              metodo_pago: data.metodo,
              modo_pago_inversor: data.modo,
              fecha_pago: data.fecha,
              comprobante_url: data.comprobante,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            const tag = res.data.modo_pago_inversor === "reinvertir"
              ? `Reinvertido. Capital actual: ${formatCurrency(res.data.capital_actual_post, (l.moneda as "ARS" | "USD"))}`
              : "Retirado. Capital sin cambios";
            toast.success(`Liquidación pagada · ${tag}`);
            if (res.data.recibo_signed_url) {
              window.open(res.data.recibo_signed_url, "_blank");
            } else {
              toast.warning(
                "Recibo no se pudo generar — revisar bucket recibos-liquidacion (SETUP §16).",
              );
            }
            setPagarOpen(false);
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
  moneda,
  montoInteres,
  capitalActual,
  onSubmit,
}: {
  onClose: () => void;
  pending: boolean;
  moneda: "ARS" | "USD";
  montoInteres: number;
  capitalActual: number;
  onSubmit: (data: {
    metodo: MetodoPago;
    modo: ModoPagoInversor;
    fecha: string;
    comprobante: string;
  }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [modo, setModo] = useState<ModoPagoInversor>("retirar");
  const [fecha, setFecha] = useState<string>(today);
  const [comprobante, setComprobante] = useState<string>("");

  const capitalPost =
    modo === "reinvertir" ? capitalActual + montoInteres : capitalActual;

  return (
    <div className="rounded-md border border-svi-gold/40 bg-svi-gold/5 p-3 space-y-2 max-w-md">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] uppercase tracking-wider text-svi-muted-2 col-span-2">
          Decisión del inversor
        </label>
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          {MODOS_PAGO_INVERSOR.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`px-2.5 py-1.5 rounded border text-[11px] text-left ${
                modo === m
                  ? m === "reinvertir"
                    ? "border-svi-success bg-svi-success/10 text-svi-success"
                    : "border-svi-info bg-svi-info/10 text-svi-info"
                  : "border-svi-border-muted bg-svi-dark text-svi-muted hover:border-svi-muted-2"
              }`}
            >
              {LABEL_MODO_PAGO_INVERSOR[m]}
            </button>
          ))}
        </div>
        {modo === "reinvertir" && (
          <p className="col-span-2 text-[10px] text-svi-success">
            Capital pasará de {formatCurrency(capitalActual, moneda)} a{" "}
            {formatCurrency(capitalPost, moneda)}
          </p>
        )}
      </div>

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
          onClick={() => onSubmit({ metodo, modo, fecha, comprobante })}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Confirmar pago
        </Button>
      </div>
    </div>
  );
}
