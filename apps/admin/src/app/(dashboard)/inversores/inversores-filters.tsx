"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";

const PORTAL = [
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

export function InversoresFilters({
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
    startTransition(() => router.push(`/inversores?${next.toString()}`));
  };

  const reset = () => startTransition(() => router.push("/inversores"));

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
          placeholder="Buscar por nombre, DNI, CUIT, email, banco..."
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      <select
        value={params.get("portal_activo") ?? ""}
        onChange={(e) => set("portal_activo", e.target.value)}
        aria-label="Portal"
        className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
      >
        <option value="">Portal: todos</option>
        {PORTAL.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

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
