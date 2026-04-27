"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, LayoutGrid, List, X } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";

interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
}

interface Props {
  sucursales: Sucursal[];
  currentView: "tabla" | "grilla";
  currentFilters: Record<string, unknown>;
}

const TIPOS = ["auto", "4x4", "camioneta", "moto", "utilitario", "otro"];
const CONDICIONES = ["0km", "usado"];
const ESTADOS = ["stock", "reservado", "vendido", "consignacion", "preparacion", "baja"];

export function StockFilters({ sucursales, currentView, currentFilters }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "") next.set(key, value);
    else next.delete(key);
    next.delete("cursor");
    startTransition(() => router.push(`/stock?${next.toString()}`));
  };

  const reset = () => {
    startTransition(() => router.push("/stock"));
  };

  const hasFilters = Object.keys(currentFilters).some(
    (k) => !["limit", "cursor"].includes(k) && currentFilters[k] !== undefined,
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", isPending && "opacity-60")}>
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
        <Input
          placeholder="Buscar marca, modelo, patente..."
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      <Select label="Tipo" value={params.get("tipo") ?? ""} onChange={(v) => set("tipo", v)} options={TIPOS} />
      <Select
        label="Condición"
        value={params.get("condicion") ?? ""}
        onChange={(v) => set("condicion", v)}
        options={CONDICIONES}
      />
      <Select label="Estado" value={params.get("estado") ?? ""} onChange={(v) => set("estado", v)} options={ESTADOS} />
      <Select
        label="Sucursal"
        value={params.get("sucursal_id") ?? ""}
        onChange={(v) => set("sucursal_id", v)}
        options={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
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

      <div className="ml-auto inline-flex rounded-lg border border-svi-border-muted overflow-hidden">
        <ViewToggle active={currentView === "grilla"} onClick={() => set("view", "grilla")} icon={LayoutGrid} label="Grilla" />
        <ViewToggle active={currentView === "tabla"} onClick={() => set("view", "tabla")} icon={List} label="Tabla" />
      </div>
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
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center transition-colors",
        active ? "bg-svi-elevated text-svi-gold" : "text-svi-muted-2 hover:text-svi-white",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
