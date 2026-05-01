"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page:         number;       // 1-based
  totalPages:   number;
  pageSize:     number;
  total:        number;
  onPageChange: (page: number) => void;
}

const MAX_VISIBLE = 7;

/**
 * Calcula la lista de páginas a mostrar, intercalando "..." donde corresponda.
 * Resultado posible: [1, "...", 5, 6, 7, 8, 9, "...", 25]
 *
 * Reglas:
 *  - Si totalPages <= MAX_VISIBLE => mostramos todas.
 *  - Siempre incluimos la 1 y la última.
 *  - Ventana centrada en `page`, ajustada si está cerca de los bordes.
 */
function buildPages(page: number, totalPages: number): (number | "ellipsis-l" | "ellipsis-r")[] {
  if (totalPages <= MAX_VISIBLE) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: (number | "ellipsis-l" | "ellipsis-r")[] = [];
  const windowSize = MAX_VISIBLE - 2; // dejamos lugar para "1" y "totalPages"

  // Calcular ventana centrada
  let start = Math.max(2, page - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;

  if (end >= totalPages) {
    end = totalPages - 1;
    start = Math.max(2, end - windowSize + 1);
  }

  result.push(1);
  if (start > 2) result.push("ellipsis-l");
  for (let i = start; i <= end; i++) result.push(i);
  if (end < totalPages - 1) result.push("ellipsis-r");
  result.push(totalPages);

  return result;
}

export function Pagination({ page, totalPages, pageSize, total, onPageChange }: Props) {
  if (total === 0) return null;

  const pages = buildPages(page, totalPages);
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <p className="text-xs text-svi-muted-2">
        Mostrando <span className="text-svi-white tabular-nums">{desde}</span>–
        <span className="text-svi-white tabular-nums">{hasta}</span> de{" "}
        <span className="text-svi-white tabular-nums">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Paginación">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs text-svi-muted hover:text-svi-white hover:bg-svi-elevated disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-3.5" />
          Anterior
        </button>

        {pages.map((p, idx) => {
          if (p === "ellipsis-l" || p === "ellipsis-r") {
            return (
              <span
                key={`${p}-${idx}`}
                className="inline-flex items-center justify-center h-8 w-8 text-xs text-svi-muted-2"
              >
                …
              </span>
            );
          }
          const active = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-xs tabular-nums transition ${
                active
                  ? "bg-svi-gold text-svi-black font-semibold"
                  : "text-svi-muted hover:text-svi-white hover:bg-svi-elevated"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs text-svi-muted hover:text-svi-white hover:bg-svi-elevated disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="size-3.5" />
        </button>
      </nav>
    </div>
  );
}
