"use client";

import { useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { DateRangePicker } from "@/components/shared/date-range-picker";

type Operacion = "TODAS" | "INSERT" | "UPDATE" | "DELETE" | "EVENT";

interface Props {
  initial: {
    desde:     string;
    hasta:     string;
    operacion: Operacion;
    action:    string;
  };
}

const OPERACIONES: { value: Operacion; label: string }[] = [
  { value: "TODAS",  label: "Todas las operaciones" },
  { value: "INSERT", label: "Inserción" },
  { value: "UPDATE", label: "Modificación" },
  { value: "DELETE", label: "Eliminación" },
  { value: "EVENT",  label: "Evento semántico" },
];

export function FiltrosAuditoria({ initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [actionInput, setActionInput] = useState(initial.action);

  function pushParams(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => router.push(`/caja/auditoria?${next.toString()}`));
  }

  function onDateChange({ desde, hasta }: { desde: string; hasta: string }) {
    const next = new URLSearchParams(params.toString());
    next.set("desde", desde);
    next.set("hasta", hasta);
    pushParams(next);
  }

  function onOperacionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as Operacion;
    const next = new URLSearchParams(params.toString());
    if (value === "TODAS") next.delete("operacion");
    else next.set("operacion", value);
    pushParams(next);
  }

  function onActionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    const trimmed = actionInput.trim();
    if (trimmed.length === 0) next.delete("action");
    else next.set("action", trimmed);
    pushParams(next);
  }

  function onLimpiar() {
    setActionInput("");
    startTransition(() => router.push("/caja/auditoria"));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 bg-svi-card border border-svi-border-muted rounded-2xl p-4">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-svi-muted uppercase tracking-wider">Rango</label>
        <DateRangePicker
          desde={initial.desde}
          hasta={initial.hasta}
          onChange={onDateChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-svi-muted uppercase tracking-wider">Operación</label>
        <select
          value={initial.operacion}
          onChange={onOperacionChange}
          className="h-10 px-3 rounded-lg border border-svi-border-muted bg-svi-dark text-sm text-svi-white hover:border-svi-gold focus:border-svi-gold focus:outline-none transition"
        >
          {OPERACIONES.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={onActionSubmit} className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <label className="text-[11px] text-svi-muted uppercase tracking-wider">
          Acción semántica
        </label>
        <input
          type="text"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          placeholder="ej: anular_con_motivo"
          className="h-10 px-3 rounded-lg border border-svi-border-muted bg-svi-dark text-sm text-svi-white placeholder:text-svi-muted-2 hover:border-svi-gold focus:border-svi-gold focus:outline-none transition"
        />
      </form>

      <button
        type="button"
        onClick={onLimpiar}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-svi-border-muted text-sm text-svi-muted hover:text-svi-white hover:border-svi-error transition"
      >
        <X className="size-3.5" />
        Limpiar
      </button>
    </div>
  );
}
