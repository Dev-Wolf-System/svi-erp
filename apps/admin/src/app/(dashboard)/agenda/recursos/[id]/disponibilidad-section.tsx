"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  crearDisponibilidad,
  eliminarDisponibilidad,
  type DisponibilidadFranja,
  type SlotMinutos,
} from "@/modules/agenda";

const DIAS = [
  { v: 1, label: "Lun" },
  { v: 2, label: "Mar" },
  { v: 3, label: "Mié" },
  { v: 4, label: "Jue" },
  { v: 5, label: "Vie" },
  { v: 6, label: "Sáb" },
  { v: 0, label: "Dom" },
];

export function DisponibilidadSection({
  recursoId,
  dispos,
}: {
  recursoId: string;
  dispos: DisponibilidadFranja[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [diasSel, setDiasSel] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [slot, setSlot] = useState<SlotMinutos>(30);

  function toggleDia(d: number) {
    setDiasSel((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (diasSel.length === 0) {
      toast.error("Elegí al menos un día");
      return;
    }
    startTransition(async () => {
      const errores: string[] = [];
      for (const dia of diasSel) {
        const res = await crearDisponibilidad({
          recurso_id: recursoId,
          dia_semana: dia,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          slot_minutos: slot,
        });
        if (!res.ok) errores.push(`${DIAS.find((d) => d.v === dia)?.label}: ${res.error}`);
      }
      if (errores.length === 0) {
        toast.success(`${diasSel.length} franja(s) creada(s)`);
        setShowForm(false);
      } else {
        toast.error(errores.join(" · "));
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta franja?")) return;
    startTransition(async () => {
      const res = await eliminarDisponibilidad(id, recursoId);
      if (res.ok) toast.success("Eliminada");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {dispos.length > 0 && (
        <div className="text-xs text-svi-muted-2 font-mono uppercase tracking-wider">
          Acciones por franja:
        </div>
      )}
      {dispos.length > 0 && (
        <ul className="space-y-1">
          {dispos.map((d) => (
            <li key={d.id} className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onDelete(d.id)}
                disabled={pending}
                className="text-xs text-svi-error hover:text-svi-error/80 inline-flex items-center gap-1"
              >
                <Trash2 className="size-3" />
                Eliminar franja del{" "}
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d.dia_semana]}{" "}
                {d.hora_inicio.slice(0, 5)}-{d.hora_fin.slice(0, 5)}
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
          Agregar franja(s) horaria(s)
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 p-3 rounded-lg bg-svi-elevated border border-svi-border-muted">
          <div>
            <label className="text-xs text-svi-muted-2 block mb-1">Días</label>
            <div className="flex gap-1 flex-wrap">
              {DIAS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDia(d.v)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition ${
                    diasSel.includes(d.v)
                      ? "border-svi-gold bg-svi-gold/10 text-svi-gold"
                      : "border-svi-border-muted text-svi-muted hover:text-svi-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-svi-muted-2 block mb-1">Desde</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-svi-muted-2 block mb-1">Hasta</label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                required
                className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-svi-muted-2 block mb-1">Slot</label>
              <select
                value={slot}
                onChange={(e) => setSlot(Number(e.target.value) as SlotMinutos)}
                className="w-full px-2 py-1.5 rounded-md bg-svi-card border border-svi-border-muted text-svi-white text-sm focus:border-svi-gold focus:outline-none"
              >
                {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Guardar {diasSel.length > 1 ? `(${diasSel.length} días)` : ""}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
