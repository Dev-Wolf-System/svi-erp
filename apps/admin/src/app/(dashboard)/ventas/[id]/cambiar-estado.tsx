"use client";

import { useTransition } from "react";
import { toast, Toaster } from "sonner";
import {
  ESTADOS_VENTA,
  LABEL_ESTADO,
  type EstadoVenta,
} from "@/modules/ventas/schemas";
import { cambiarEstadoVenta } from "@/modules/ventas/actions";

export function CambiarEstadoSelect({
  id,
  estadoActual,
}: {
  id: string;
  estadoActual: EstadoVenta;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value as EstadoVenta;
    if (nuevo === estadoActual) return;
    if (nuevo === "anulado") {
      toast.error("Para anular usá el botón Anular (requiere motivo)");
      e.target.value = estadoActual;
      return;
    }
    startTransition(async () => {
      const res = await cambiarEstadoVenta({ id, estado: nuevo });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Estado: ${LABEL_ESTADO[nuevo]}`);
    });
  }

  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <select
        defaultValue={estadoActual}
        onChange={onChange}
        disabled={pending}
        aria-label="Cambiar estado"
        className="h-9 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-xs text-svi-white focus:border-svi-gold focus:outline-none disabled:opacity-50"
      >
        {ESTADOS_VENTA.filter((e) => e !== "anulado").map((e) => (
          <option key={e} value={e}>
            → {LABEL_ESTADO[e]}
          </option>
        ))}
      </select>
    </>
  );
}
