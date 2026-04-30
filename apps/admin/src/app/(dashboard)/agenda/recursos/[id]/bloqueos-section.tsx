"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { crearBloqueo, eliminarBloqueo, type Bloqueo } from "@/modules/agenda";

export function BloqueosSection({
  recursoId,
  bloqueos,
}: {
  recursoId: string;
  bloqueos: Bloqueo[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desde || !hasta) {
      toast.error("Completá las fechas");
      return;
    }
    startTransition(async () => {
      const res = await crearBloqueo({
        recurso_id: recursoId,
        desde: new Date(desde).toISOString(),
        hasta: new Date(hasta).toISOString(),
        motivo: motivo.trim() || null,
      });
      if (res.ok) {
        toast.success("Bloqueo creado");
        setShowForm(false);
        setDesde("");
        setHasta("");
        setMotivo("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return;
    startTransition(async () => {
      const res = await eliminarBloqueo(id, recursoId);
      if (res.ok) toast.success("Eliminado");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {bloqueos.length > 0 && (
        <ul className="space-y-1">
          {bloqueos.map((b) => (
            <li key={b.id} className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onDelete(b.id)}
                disabled={pending}
                className="text-xs text-svi-error hover:text-svi-error/80 inline-flex items-center gap-1"
              >
                <Trash2 className="size-3" />
                Eliminar bloqueo
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs px-3 py-2 rounded-md border border-dashed border-svi-border-muted text-svi-muted hover:text-svi-white hover:border-svi-gold/40 transition inline-flex items-center gap-1.5 w-full justify-center"
        >
          <Plus className="size-3.5" />
          Agregar bloqueo
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 p-3 rounded-lg bg-svi-elevated border border-svi-border-muted">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-svi-muted-2 block mb-1">Desde</label>
              <input
                type="datetime-local"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                required
                className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-svi-muted-2 block mb-1">Hasta</label>
              <input
                type="datetime-local"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                required
                className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-svi-muted-2 block mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              placeholder="Vacaciones, feriado, capacitación..."
              className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 text-svi-muted hover:text-svi-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="text-xs px-3 py-1.5 rounded-md bg-svi-gold text-svi-black font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {pending && <Loader2 className="size-3 animate-spin" />}
              Guardar bloqueo
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
