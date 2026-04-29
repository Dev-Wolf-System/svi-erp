"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { softDeleteInversion } from "@/modules/inversiones/actions";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      const res = await softDeleteInversion(id);
      if (!res.ok) {
        toast.error(res.error);
        setConfirming(false);
        return;
      }
      toast.success("Inversión eliminada");
      router.push("/inversiones");
    });
  }

  return (
    <Button
      onClick={handleClick}
      variant={confirming ? "destructive" : "ghost"}
      disabled={pending}
      size="sm"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {confirming ? "Confirmar baja" : "Eliminar"}
    </Button>
  );
}
