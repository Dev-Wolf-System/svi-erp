"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { generarLiquidacionesMesActual } from "@/modules/liquidaciones-inversion/actions";

export function GenerarMesActualButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      const res = await generarLiquidacionesMesActual();
      setConfirming(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { creadas, ya_existian, errores } = res.data;
      const partes: string[] = [];
      if (creadas) partes.push(`${creadas} creada(s)`);
      if (ya_existian) partes.push(`${ya_existian} ya existía(n)`);
      if (errores.length) partes.push(`${errores.length} con error`);
      const msg = partes.join(" · ") || "Sin cambios";
      if (errores.length) {
        toast.warning(msg);
        for (const e of errores.slice(0, 3)) toast.error(e);
      } else {
        toast.success(msg);
      }
    });
  }

  return (
    <Button
      onClick={run}
      disabled={pending}
      variant={confirming ? "destructive" : "primary"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CalendarPlus className="h-4 w-4" />
      )}
      {confirming ? "Confirmar generación" : "Generar mes actual"}
    </Button>
  );
}
