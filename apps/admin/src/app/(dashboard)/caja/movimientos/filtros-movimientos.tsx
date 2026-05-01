"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@repo/utils";
import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO } from "@/modules/caja/schemas";
import { DateRangePicker } from "@/components/shared/date-range-picker";

interface InitialFilters {
  desde:         string;
  hasta:         string;
  tipo:          string;  // "todos" | "ingreso" | "egreso"
  categoria:     string;  // "todas" | <value>
  moneda:        string;  // "todas" | "ARS" | "USD"
  concepto:      string;
  registradoPor: string;  // "" o user_id
}

interface Props {
  initial:  InitialFilters;
  usuarios: Array<{ id: string; nombre: string }>;
}

const SELECT_CLASS =
  "h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none";

export function FiltrosMovimientos({ initial, usuarios }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado local del input concepto para debounce
  const [conceptoLocal, setConceptoLocal] = useState(initial.concepto);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setConceptoLocal(initial.concepto);
  }, [initial.concepto]);

  function pushParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === "todos" || v === "todas") {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    // Reset de página al cambiar cualquier filtro
    next.delete("page");
    startTransition(() => router.push(`/caja/movimientos?${next.toString()}`));
  }

  function setRange(next: { desde: string; hasta: string }) {
    pushParams({ desde: next.desde, hasta: next.hasta });
  }

  function setTipo(v: string) {
    // Al cambiar tipo, reseteamos categoría (las opciones cambian)
    pushParams({ tipo: v, categoria: "todas" });
  }

  function setCategoria(v: string) {
    pushParams({ categoria: v });
  }

  function setMoneda(v: string) {
    pushParams({ moneda: v });
  }

  function setRegistradoPor(v: string) {
    pushParams({ registradoPor: v });
  }

  function handleConceptoChange(value: string) {
    setConceptoLocal(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushParams({ concepto: value.trim() });
    }, 300);
  }

  function reset() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setConceptoLocal("");
    startTransition(() => router.push("/caja/movimientos"));
  }

  const hasFilters =
    (initial.tipo && initial.tipo !== "todos") ||
    (initial.categoria && initial.categoria !== "todas") ||
    (initial.moneda && initial.moneda !== "todas") ||
    initial.concepto.length > 0 ||
    initial.registradoPor.length > 0;

  // Categorías dependientes del tipo
  const categoriasDisponibles =
    initial.tipo === "ingreso"
      ? CATEGORIAS_INGRESO
      : initial.tipo === "egreso"
        ? CATEGORIAS_EGRESO
        : null;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 px-4 py-3 bg-svi-bg/90 backdrop-blur border-b border-svi-border-muted/50 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:overflow-x-auto">
        <DateRangePicker
          desde={initial.desde}
          hasta={initial.hasta}
          onChange={setRange}
        />

        <select
          value={initial.tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Tipo"
          className={SELECT_CLASS}
        >
          <option value="todos">Tipo: todos</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>

        <select
          value={initial.categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Categoría"
          disabled={!categoriasDisponibles}
          className={cn(SELECT_CLASS, "disabled:opacity-50 disabled:cursor-not-allowed")}
        >
          <option value="todas">Categoría: todas</option>
          {categoriasDisponibles?.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={initial.moneda}
          onChange={(e) => setMoneda(e.target.value)}
          aria-label="Moneda"
          className={SELECT_CLASS}
        >
          <option value="todas">Moneda: todas</option>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
          <input
            type="text"
            placeholder="Buscar por concepto..."
            value={conceptoLocal}
            onChange={(e) => handleConceptoChange(e.target.value)}
            className="w-full h-10 rounded-lg border border-svi-border-muted bg-svi-dark pl-10 pr-3 text-sm text-svi-white placeholder:text-svi-disabled focus:border-svi-gold focus:outline-none"
          />
        </div>

        <select
          value={initial.registradoPor}
          onChange={(e) => setRegistradoPor(e.target.value)}
          aria-label="Registrado por"
          className={SELECT_CLASS}
        >
          <option value="">Registrado por: todos</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-xs text-svi-muted-2 hover:text-svi-error transition shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
