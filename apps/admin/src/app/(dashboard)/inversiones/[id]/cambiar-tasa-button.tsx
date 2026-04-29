"use client";

import { useState, useTransition } from "react";
import { Loader2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Input, Textarea } from "@repo/ui";
import { cambiarTasaInversion } from "@/modules/inversiones/actions";

export function CambiarTasaButton({
  id,
  tasaActual,
}: {
  id: string;
  tasaActual: number;
}) {
  const [open, setOpen] = useState(false);
  const [tasa, setTasa] = useState<string>(tasaActual.toFixed(2));
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const tasaNueva = Number(tasa);
    if (Number.isNaN(tasaNueva) || tasaNueva < 0 || tasaNueva > 99.99) {
      toast.error("Tasa inválida (0 a 99.99)");
      return;
    }
    if (motivo.trim().length < 3) {
      toast.error("Motivo requerido (mínimo 3 caracteres)");
      return;
    }
    startTransition(async () => {
      const res = await cambiarTasaInversion({
        id,
        tasa_nueva: tasaNueva,
        motivo: motivo.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Tasa actualizada");
      setOpen(false);
      setMotivo("");
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="ghost">
        <TrendingUp className="h-4 w-4" />
        Cambiar tasa
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-svi-gold/40 bg-svi-gold/5 p-4 space-y-3 max-w-md">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm text-svi-gold">Cambiar tasa</h4>
        <button
          onClick={() => setOpen(false)}
          className="text-svi-muted-2 hover:text-svi-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Field label="Nueva tasa mensual (%)" htmlFor="tasa-nueva">
        <Input
          id="tasa-nueva"
          type="number"
          step="0.01"
          value={tasa}
          onChange={(e) => setTasa(e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Motivo" htmlFor="motivo">
        <Textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ajuste por inflación, renegociación, etc."
          rows={2}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Aplicar
        </Button>
      </div>
    </div>
  );
}
