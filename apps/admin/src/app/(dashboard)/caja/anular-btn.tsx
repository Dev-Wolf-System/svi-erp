"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, X } from "lucide-react";
import { anularMovimiento } from "@/modules/caja/actions";

export function AnularBtn({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAnular() {
    startTransition(async () => {
      const res = await anularMovimiento(id);
      if (res.ok) {
        toast.success("Movimiento anulado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        title="Anular movimiento"
        className="p-1.5 rounded-md text-svi-muted-2 hover:text-svi-error hover:bg-svi-error/10 transition"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleAnular}
        className="text-xs px-2 py-1 rounded-md bg-svi-error text-white font-medium disabled:opacity-50 inline-flex items-center gap-1"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : null}
        Anular
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="text-xs p-1 rounded-md text-svi-muted-2 hover:text-svi-white transition"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
