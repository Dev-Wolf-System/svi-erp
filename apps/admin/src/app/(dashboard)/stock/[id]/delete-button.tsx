"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { softDeleteVehiculo } from "@/modules/stock/actions";

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
      const res = await softDeleteVehiculo(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Vehículo dado de baja");
      router.push("/stock");
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {confirming ? "¿Confirmar?" : "Dar de baja"}
      </Button>
    </>
  );
}
