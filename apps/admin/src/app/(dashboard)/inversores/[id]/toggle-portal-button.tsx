"use client";

import { useTransition } from "react";
import { Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { togglePortalInversor } from "@/modules/inversores/actions";

export function TogglePortalButton({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await togglePortalInversor(id, !activo);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(activo ? "Portal deshabilitado" : "Portal habilitado");
    });
  }

  return (
    <Button onClick={toggle} variant="ghost" disabled={pending} size="sm">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : activo ? (
        <PowerOff className="h-4 w-4" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      {activo ? "Deshabilitar portal" : "Habilitar portal"}
    </Button>
  );
}
