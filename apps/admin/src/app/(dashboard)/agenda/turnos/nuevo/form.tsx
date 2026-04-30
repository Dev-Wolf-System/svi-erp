"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  crearTurno,
  PERSONA_TIPOS,
  TURNO_MODALIDADES,
  type PersonaTipo,
  type Recurso,
  type TurnoModalidad,
} from "@/modules/agenda";

export function TurnoNuevoForm({ recursos }: { recursos: Recurso[] }) {
  const router = useRouter();
  const firstRecurso = recursos[0];
  if (!firstRecurso) return null;
  const [recursoId, setRecursoId] = useState<string>(firstRecurso.id);
  const [personaTipo, setPersonaTipo] = useState<PersonaTipo>("externo");
  const [personaId, setPersonaId] = useState("");
  const [externoNombre, setExternoNombre] = useState("");
  const [externoTelefono, setExternoTelefono] = useState("");
  const [inicioLocal, setInicioLocal] = useState("");
  const [duracionMin, setDuracionMin] = useState(30);
  const [modalidad, setModalidad] = useState<TurnoModalidad>("presencial");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      toast.error("Indicá motivo");
      return;
    }
    if (!inicioLocal) {
      toast.error("Elegí fecha y hora");
      return;
    }
    if (personaTipo === "externo" && !externoNombre.trim()) {
      toast.error("Cargá el nombre del externo");
      return;
    }
    if (personaTipo !== "externo" && !personaId.trim()) {
      toast.error(`Seleccioná un ${personaTipo}`);
      return;
    }

    const inicio = new Date(inicioLocal);
    const fin = new Date(inicio.getTime() + duracionMin * 60_000);

    startTransition(async () => {
      const res = await crearTurno({
        recurso_id: recursoId,
        persona_tipo: personaTipo,
        persona_id: personaTipo === "externo" ? null : personaId,
        externo_nombre: personaTipo === "externo" ? externoNombre.trim() : null,
        externo_telefono:
          personaTipo === "externo" ? externoTelefono.trim() || null : null,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        modalidad,
        motivo: motivo.trim(),
        notas: notas.trim() || null,
      });
      if (res.ok) {
        toast.success("Turno creado");
        router.push("/agenda");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Recurso
        </label>
        <select
          value={recursoId}
          onChange={(e) => setRecursoId(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none"
        >
          {recursos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre} — {r.tipo}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
            Inicio
          </label>
          <input
            type="datetime-local"
            value={inicioLocal}
            onChange={(e) => setInicioLocal(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
            Duración
          </label>
          <select
            value={duracionMin}
            onChange={(e) => setDuracionMin(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none"
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Persona
        </label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {PERSONA_TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setPersonaTipo(t);
                setPersonaId("");
              }}
              className={`text-xs px-3 py-1.5 rounded-md border transition capitalize ${
                personaTipo === t
                  ? "border-svi-gold bg-svi-gold/10 text-svi-gold"
                  : "border-svi-border-muted text-svi-muted hover:text-svi-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {personaTipo === "externo" ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={externoNombre}
              onChange={(e) => setExternoNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              maxLength={100}
              className="px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2"
            />
            <input
              type="tel"
              value={externoTelefono}
              onChange={(e) => setExternoTelefono(e.target.value)}
              placeholder="Teléfono (opcional)"
              maxLength={20}
              className="px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2"
            />
          </div>
        ) : (
          <input
            type="text"
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
            placeholder={`UUID del ${personaTipo} (mejorar a selector en F8.5)`}
            required
            className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2 font-mono text-xs"
          />
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Modalidad
        </label>
        <div className="flex gap-1.5">
          {TURNO_MODALIDADES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModalidad(m)}
              className={`text-xs px-3 py-1.5 rounded-md border transition capitalize ${
                modalidad === m
                  ? "border-svi-gold bg-svi-gold/10 text-svi-gold"
                  : "border-svi-border-muted text-svi-muted hover:text-svi-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Motivo
        </label>
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          placeholder="Reunión inicial, firma de contrato, etc."
          className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          Notas (opcional)
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-svi-border-muted">
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
          Crear turno
        </button>
      </div>
    </form>
  );
}
