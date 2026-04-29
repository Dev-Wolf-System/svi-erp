"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  cambiarEstadoInversion,
} from "@/modules/inversiones/actions";
import {
  ESTADOS_INVERSION,
  LABEL_ESTADO,
  type EstadoInversion,
} from "@/modules/inversiones/schemas";

export function CambiarEstadoButton({
  id,
  estadoActual,
}: {
  id: string;
  estadoActual: EstadoInversion;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value as EstadoInversion;
    if (nuevo === estadoActual) return;
    if (
      nuevo === "finalizada" &&
      !confirm(
        "Una vez finalizada no podrás cambiar su tasa. ¿Continuar?",
      )
    ) {
      e.target.value = estadoActual;
      return;
    }
    startTransition(async () => {
      const res = await cambiarEstadoInversion({ id, estado: nuevo });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Estado: ${LABEL_ESTADO[nuevo]}`);
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-svi-muted-2" />}
      <select
        value={estadoActual}
        onChange={onChange}
        disabled={pending}
        aria-label="Cambiar estado"
        className="h-9 rounded-md border border-svi-border-muted bg-svi-dark px-2.5 text-xs text-svi-white focus:border-svi-gold focus:outline-none"
      >
        {ESTADOS_INVERSION.map((e) => (
          <option key={e} value={e}>
            {LABEL_ESTADO[e]}
          </option>
        ))}
      </select>
    </div>
  );
}
