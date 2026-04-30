"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog, Briefcase, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import { crearRecurso, RECURSO_TIPOS, type RecursoTipo } from "@/modules/agenda";

const TIPO_META: Record<
  RecursoTipo,
  { label: string; description: string; Icon: typeof UserCog }
> = {
  owner: {
    label: "Owner",
    description: "Dueño de la empresa, dirección.",
    Icon: UserCog,
  },
  asesor: {
    label: "Asesor",
    description: "Asesor de inversiones u otra especialización.",
    Icon: Briefcase,
  },
  vendedor: {
    label: "Vendedor",
    description: "Comercial que atiende prospectos / clientes.",
    Icon: Users,
  },
  sala: {
    label: "Sala",
    description: "Recurso físico (sala de reuniones, oficina).",
    Icon: Building2,
  },
};

const COLORES = [
  "#C5A059", // svi-gold
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#06B6D4",
];

export function RecursoNuevoForm() {
  const router = useRouter();
  const [tipo, setTipo] = useState<RecursoTipo>("owner");
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLORES[0]!);
  const [notas, setNotas] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    startTransition(async () => {
      const res = await crearRecurso({
        tipo,
        nombre: nombre.trim(),
        color,
        activo: true,
        notas: notas.trim() || null,
      });
      if (res.ok) {
        toast.success("Recurso creado");
        router.push(`/agenda/recursos/${res.data.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-xs font-mono uppercase tracking-wider text-svi-muted-2 mb-2">
          Tipo
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RECURSO_TIPOS.map((t) => {
            const meta = TIPO_META[t];
            const Icon = meta.Icon;
            const selected = tipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                  selected
                    ? "border-svi-gold bg-svi-gold/10"
                    : "border-svi-border-muted bg-svi-card hover:bg-svi-elevated"
                }`}
              >
                <Icon
                  className={`size-5 mt-0.5 shrink-0 ${selected ? "text-svi-gold" : "text-svi-muted-2"}`}
                />
                <div className="min-w-0">
                  <p className={`font-medium ${selected ? "text-svi-gold" : "text-svi-white"}`}>
                    {meta.label}
                  </p>
                  <p className="text-xs text-svi-muted">{meta.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Nombre
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={tipo === "sala" ? "Sala VIP — Sucursal Centro" : "Nombre y apellido"}
          required
          minLength={2}
          maxLength={100}
          className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white placeholder:text-svi-muted-2 focus:border-svi-gold focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Color en el calendario
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`size-8 rounded-full border-2 transition ${
                color === c
                  ? "border-svi-white scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Notas (opcional)
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Alguna nota interna sobre este recurso..."
          className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white placeholder:text-svi-muted-2 focus:border-svi-gold focus:outline-none resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-svi-border-muted">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm text-svi-muted hover:text-svi-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-svi-gold text-svi-black hover:opacity-90 transition text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Crear recurso
        </button>
      </div>
    </form>
  );
}
