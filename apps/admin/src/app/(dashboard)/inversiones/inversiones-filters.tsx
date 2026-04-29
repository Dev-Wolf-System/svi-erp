"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  ESTADOS_INVERSION,
  TIPOS_INSTRUMENTO,
  ESTADOS_REGULATORIOS,
  LABEL_ESTADO,
  LABEL_TIPO_INSTRUMENTO,
  LABEL_REGULATORIO,
} from "@/modules/inversiones/schemas";

export function InversionesFilters({
  currentFilters,
}: {
  currentFilters: Record<string, unknown>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "") next.set(key, value);
    else next.delete(key);
    next.delete("cursor");
    startTransition(() => router.push(`/inversiones?${next.toString()}`));
  };

  const reset = () => startTransition(() => router.push("/inversiones"));

  const hasFilters = Object.keys(currentFilters).some(
    (k) => !["limit", "cursor"].includes(k) && currentFilters[k] !== undefined,
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
        <Input
          placeholder="Buscar por número de contrato..."
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      <Select
        label="Estado"
        value={params.get("estado") ?? ""}
        onChange={(v) => set("estado", v)}
        options={ESTADOS_INVERSION.map((e) => ({ value: e, label: LABEL_ESTADO[e] }))}
      />
      <Select
        label="Instrumento"
        value={params.get("tipo_instrumento") ?? ""}
        onChange={(v) => set("tipo_instrumento", v)}
        options={TIPOS_INSTRUMENTO.map((t) => ({
          value: t,
          label: LABEL_TIPO_INSTRUMENTO[t],
        }))}
      />
      <Select
        label="Regulación"
        value={params.get("estado_regulatorio") ?? ""}
        onChange={(v) => set("estado_regulatorio", v)}
        options={ESTADOS_REGULATORIOS.map((e) => ({
          value: e,
          label: LABEL_REGULATORIO[e],
        }))}
      />

      {hasFilters && (
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-svi-muted-2 hover:text-svi-error transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
    >
      <option value="">{label}: todos</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
