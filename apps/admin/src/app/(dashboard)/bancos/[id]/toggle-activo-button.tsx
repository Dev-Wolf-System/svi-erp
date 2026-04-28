"use client";

import { useTransition } from "react";
import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { toggleBancoActivo } from "@/modules/bancos/actions";

export function ToggleActivoButton({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await toggleBancoActivo(id, !activo);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(activo ? "Banco desactivado" : "Banco reactivado");
    });
  }

  return (
    <>
      <Button
        variant={activo ? "destructive" : "secondary"}
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
        {activo ? "Desactivar" : "Reactivar"}
      </Button>
    </>
  );
}
