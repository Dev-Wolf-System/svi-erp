"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { decidirModoLiquidacion } from "@/lib/portal/actions";

export function DecidirModoButton({
  liquidacionId,
  modoActual,
}: {
  liquidacionId: string;
  modoActual: "retirar" | "reinvertir" | null;
}) {
  const [pending, startTransition] = useTransition();

  function elegir(modo: "retirar" | "reinvertir") {
    startTransition(async () => {
      const res = await decidirModoLiquidacion({
        liquidacion_id: liquidacionId,
        modo,
      });
      if (!res.ok) {
        alert(res.error);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {pending && (
        <Loader2 className="h-3 w-3 animate-spin text-svi-muted-2" />
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => elegir("retirar")}
        className={`px-2 h-6 rounded text-[11px] border transition-colors ${
          modoActual === "retirar"
            ? "border-svi-info bg-svi-info/10 text-svi-info"
            : "border-svi-border-muted text-svi-muted hover:text-svi-white"
        }`}
      >
        Retirar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => elegir("reinvertir")}
        className={`px-2 h-6 rounded text-[11px] border transition-colors ${
          modoActual === "reinvertir"
            ? "border-svi-success bg-svi-success/10 text-svi-success"
            : "border-svi-border-muted text-svi-muted hover:text-svi-white"
        }`}
      >
        Reinvertir
      </button>
    </div>
  );
}
