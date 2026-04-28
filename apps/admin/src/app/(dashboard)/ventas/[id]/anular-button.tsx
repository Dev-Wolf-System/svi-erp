"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { anularVenta } from "@/modules/ventas/actions";

export function AnularButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (motivo.trim().length < 3) {
      toast.error("Motivo requerido (mínimo 3 caracteres)");
      return;
    }
    startTransition(async () => {
      const res = await anularVenta({ id, motivo });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Venta anulada");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {!open ? (
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Anular
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de anulación..."
            className="h-9 w-64 rounded-lg border border-svi-error bg-svi-dark px-3 text-xs text-svi-white focus:outline-none focus:ring-1 focus:ring-svi-error"
            autoFocus
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={submit}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </>
  );
}
