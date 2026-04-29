"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@repo/utils";
import {
  ESTADOS_LIQUIDACION,
  LABEL_ESTADO,
} from "@/modules/liquidaciones-inversion/schemas";

export function LiquidacionesFilters({
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
    startTransition(() => router.push(`/liquidaciones?${next.toString()}`));
  };

  const reset = () => startTransition(() => router.push("/liquidaciones"));

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
      <select
        value={params.get("estado") ?? ""}
        onChange={(e) => set("estado", e.target.value)}
        aria-label="Estado"
        className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
      >
        <option value="">Estado: todos</option>
        {ESTADOS_LIQUIDACION.map((e) => (
          <option key={e} value={e}>
            {LABEL_ESTADO[e]}
          </option>
        ))}
      </select>

      <label className="inline-flex items-center gap-2 text-xs text-svi-muted-2">
        Desde
        <input
          type="month"
          defaultValue={params.get("periodo_desde")?.slice(0, 7) ?? ""}
          onChange={(e) => set("periodo_desde", e.target.value || undefined)}
          className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none font-mono"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-xs text-svi-muted-2">
        Hasta
        <input
          type="month"
          defaultValue={params.get("periodo_hasta")?.slice(0, 7) ?? ""}
          onChange={(e) => set("periodo_hasta", e.target.value || undefined)}
          className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none font-mono"
        />
      </label>

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
