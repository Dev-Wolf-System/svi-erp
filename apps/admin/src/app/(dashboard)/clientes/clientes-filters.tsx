"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";

interface Props {
  provincias: string[];
  currentFilters: Record<string, unknown>;
}

const TIPOS = ["persona", "empresa"];
const PORTAL = [
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

export function ClientesFilters({ provincias, currentFilters }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "") next.set(key, value);
    else next.delete(key);
    next.delete("cursor");
    startTransition(() => router.push(`/clientes?${next.toString()}`));
  };

  const reset = () => startTransition(() => router.push("/clientes"));

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
          placeholder="Buscar por nombre, DNI, CUIT, email..."
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      <Select
        label="Tipo"
        value={params.get("tipo") ?? ""}
        onChange={(v) => set("tipo", v)}
        options={TIPOS}
      />
      <Select
        label="Provincia"
        value={params.get("provincia") ?? ""}
        onChange={(v) => set("provincia", v)}
        options={provincias}
      />
      <Select
        label="Portal"
        value={params.get("portal_activo") ?? ""}
        onChange={(v) => set("portal_activo", v)}
        options={PORTAL}
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

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
    >
      <option value="">{label}: todos</option>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={v} value={v} className="capitalize">
            {l}
          </option>
        );
      })}
    </select>
  );
}
