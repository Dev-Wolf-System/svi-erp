"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { Button, Field, Input } from "@repo/ui";
import { solicitarAporte } from "@/lib/portal/actions";

export function SolicitarAporteForm({
  inversionId,
  moneda,
}: {
  inversionId: string;
  moneda: "ARS" | "USD";
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(today);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    msg: string;
  } | null>(null);

  function submit() {
    setFeedback(null);
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setFeedback({ type: "error", msg: "Monto inválido" });
      return;
    }
    startTransition(async () => {
      const res = await solicitarAporte({
        inversion_id: inversionId,
        monto_estimado: montoNum,
        fecha_estimada: fecha,
        motivo: motivo.trim() || null,
      });
      if (!res.ok) {
        setFeedback({ type: "error", msg: res.error });
        return;
      }
      setFeedback({
        type: "ok",
        msg: "Solicitud enviada. Te avisamos cuando se confirme.",
      });
      setMonto("");
      setMotivo("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Solicitar aporte adicional
        </Button>
        {feedback && (
          <div
            role="alert"
            className={`text-xs ${feedback.type === "ok" ? "text-svi-success" : "text-svi-error"}`}
          >
            {feedback.msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-svi-gold/40 bg-svi-gold/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm text-svi-gold">
          Solicitar aporte ({moneda})
        </h4>
        <button
          onClick={() => setOpen(false)}
          className="text-svi-muted-2 hover:text-svi-white"
          aria-label="Cerrar"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto a aportar" htmlFor="aporte-monto" required>
          <Input
            id="aporte-monto"
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="500000"
            className="font-mono"
          />
        </Field>
        <Field label="Fecha estimada" htmlFor="aporte-fecha" required>
          <Input
            id="aporte-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="font-mono"
          />
        </Field>
      </div>

      <Field label="Motivo (opcional)" htmlFor="aporte-motivo">
        <Input
          id="aporte-motivo"
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Aporte mensual, refuerzo, etc."
          maxLength={500}
        />
      </Field>

      {feedback?.type === "error" && (
        <div className="text-xs text-svi-error">{feedback.msg}</div>
      )}

      <p className="text-[11px] text-svi-muted-2 leading-relaxed">
        Tu solicitud queda pendiente. Cuando hagas la transferencia, el
        operador la confirmará y verás el aporte sumado a tu capital.
      </p>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar solicitud
        </Button>
      </div>
    </div>
  );
}
