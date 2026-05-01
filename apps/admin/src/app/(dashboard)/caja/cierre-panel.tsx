"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Loader2, X } from "lucide-react";
import { cerrarCaja } from "@/modules/caja/actions";

export function CierrePanel({
  sucursalId,
  fecha,
}: {
  sucursalId: string;
  fecha: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCerrar() {
    startTransition(async () => {
      const res = await cerrarCaja({ sucursal_id: sucursalId, fecha, observaciones: obs || null });
      if (res.ok) {
        toast.success("Caja cerrada correctamente");
        router.refresh();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-svi-warning/10 border border-svi-warning/30 text-svi-warning text-sm font-medium hover:bg-svi-warning/20 transition"
      >
        <Lock className="size-4" />
        Cerrar caja del día
      </button>
    );
  }

  return (
    <div className="bg-svi-card border border-svi-warning/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-svi-warning flex items-center gap-2">
          <Lock className="size-4" />
          Confirmar cierre de caja
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-svi-muted-2 hover:text-svi-white transition"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-xs text-svi-muted leading-relaxed">
        Se cerrarán todos los movimientos abiertos del día. Esta acción no se puede deshacer
        y los movimientos cerrados no podrán anularse.
      </p>
      <div>
        <label htmlFor="obs-cierre" className="block text-xs text-svi-muted mb-1.5">
          Observaciones <span className="text-svi-muted-2">(opcional)</span>
        </label>
        <textarea
          id="obs-cierre"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Diferencia de caja, incidencias…"
          className="w-full rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2 text-sm text-svi-white placeholder:text-svi-muted-2 resize-none focus:outline-none focus:ring-1 focus:ring-svi-warning/40"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-lg border border-svi-border-muted text-sm text-svi-muted hover:text-svi-white transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleCerrar}
          className="flex-1 py-2 rounded-lg bg-svi-warning text-svi-black text-sm font-semibold hover:bg-svi-warning/90 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          Cerrar caja
        </button>
      </div>
    </div>
  );
}
