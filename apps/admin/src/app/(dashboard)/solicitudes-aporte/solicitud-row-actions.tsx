"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Input } from "@repo/ui";
import {
  confirmarSolicitudAporte,
  rechazarSolicitudAporte,
} from "@/modules/solicitudes-aporte/actions";
import type { SolicitudAporteRow } from "@/modules/solicitudes-aporte/queries";

export function SolicitudRowActions({
  solicitud: s,
}: {
  solicitud: SolicitudAporteRow;
}) {
  const [mode, setMode] = useState<"none" | "confirm" | "reject">("none");
  const [pending, startTransition] = useTransition();

  if (s.estado !== "pendiente") {
    return s.aporte_id ? (
      <span className="text-[11px] text-svi-success">✓ Aporte registrado</span>
    ) : (
      <span className="text-[11px] text-svi-disabled">—</span>
    );
  }

  if (mode === "confirm") {
    return (
      <ConfirmInline
        s={s}
        pending={pending}
        onCancel={() => setMode("none")}
        onSubmit={(data) => {
          startTransition(async () => {
            const res = await confirmarSolicitudAporte({
              id: s.id,
              monto_real: data.monto,
              fecha_real: data.fecha,
              comprobante_url: data.comprobante,
            });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Aporte registrado y solicitud confirmada");
              setMode("none");
            }
          });
        }}
      />
    );
  }

  if (mode === "reject") {
    return (
      <RejectInline
        pending={pending}
        onCancel={() => setMode("none")}
        onSubmit={(motivo) => {
          startTransition(async () => {
            const res = await rechazarSolicitudAporte({
              id: s.id,
              motivo_rechazo: motivo,
            });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Solicitud rechazada");
              setMode("none");
            }
          });
        }}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => setMode("confirm")}
        className="inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] text-svi-success hover:bg-svi-success/10"
      >
        <Check className="h-3 w-3" />
        Confirmar
      </button>
      <button
        onClick={() => setMode("reject")}
        className="inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] text-svi-muted-2 hover:bg-svi-elevated hover:text-svi-error"
      >
        <X className="h-3 w-3" />
        Rechazar
      </button>
    </div>
  );
}

function ConfirmInline({
  s,
  pending,
  onCancel,
  onSubmit,
}: {
  s: SolicitudAporteRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    monto: number;
    fecha: string;
    comprobante: string;
  }) => void;
}) {
  const [monto, setMonto] = useState(s.monto_estimado);
  const [fecha, setFecha] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [comprobante, setComprobante] = useState("");

  return (
    <div className="rounded-md border border-svi-success/40 bg-svi-success/5 p-2 space-y-2 max-w-sm">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Monto recibido" htmlFor="monto-real">
          <Input
            id="monto-real"
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="h-7 text-xs font-mono"
          />
        </Field>
        <Field label="Fecha real" htmlFor="fecha-real">
          <Input
            id="fecha-real"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-7 text-xs font-mono"
          />
        </Field>
      </div>
      <Field label="URL comprobante (opcional)" htmlFor="comp-real">
        <Input
          id="comp-real"
          type="url"
          value={comprobante}
          onChange={(e) => setComprobante(e.target.value)}
          placeholder="https://..."
          className="h-7 text-xs"
        />
      </Field>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSubmit({ monto: Number(monto), fecha, comprobante })
          }
          disabled={pending}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Registrar aporte
        </Button>
      </div>
    </div>
  );
}

function RejectInline({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="rounded-md border border-svi-error/40 bg-svi-error/5 p-2 space-y-2 max-w-sm">
      <Input
        type="text"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo del rechazo (mín 3 caracteres)"
        className="h-7 text-xs"
        maxLength={500}
      />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => onSubmit(motivo.trim())}
          disabled={pending || motivo.trim().length < 3}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Confirmar rechazo
        </Button>
      </div>
    </div>
  );
}
