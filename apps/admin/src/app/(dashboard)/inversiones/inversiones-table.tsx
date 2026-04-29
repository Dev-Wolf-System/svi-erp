import Link from "next/link";
import { TrendingUp, MoreVertical } from "lucide-react";
import { formatCurrency, formatPercent, formatDate } from "@repo/utils";
import {
  LABEL_ESTADO,
  LABEL_TIPO_INSTRUMENTO,
  LABEL_REGULATORIO,
  COLOR_ESTADO,
  COLOR_REGULATORIO,
} from "@/modules/inversiones/schemas";
import type { InversionListRow } from "@/modules/inversiones/queries";

export function InversionesTable({ items }: { items: InversionListRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>N° contrato</Th>
              <Th>Inversor</Th>
              <Th>Capital</Th>
              <Th>Tasa / mes</Th>
              <Th>Inicio</Th>
              <Th>Instrumento</Th>
              <Th>Regulación</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((i) => (
              <tr
                key={i.id}
                className="hover:bg-svi-elevated/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/inversiones/${i.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-svi-elevated text-svi-gold">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-mono text-xs text-svi-gold">
                        {i.numero_contrato}
                      </span>
                      {i.sucursal && (
                        <span className="block text-[10px] uppercase tracking-wider text-svi-muted-2">
                          {i.sucursal.nombre}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversores/${i.inversor.id}`}
                    className="text-sm text-svi-white hover:text-svi-gold truncate max-w-[160px] block"
                  >
                    {i.inversor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <span className="block text-svi-white">
                    {formatCurrency(Number(i.capital_actual), i.moneda as "ARS" | "USD")}
                  </span>
                  {Number(i.capital_actual) !== Number(i.capital_inicial) && (
                    <span className="block text-[10px] text-svi-muted-2">
                      Inicial:{" "}
                      {formatCurrency(Number(i.capital_inicial), i.moneda as "ARS" | "USD")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-svi-gold">
                  {formatPercent(Number(i.tasa_mensual), 2)}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  <span className="block">{formatDate(i.fecha_inicio)}</span>
                  {i.fecha_vencimiento && (
                    <span className="block text-[10px] text-svi-muted-2">
                      Vence: {formatDate(i.fecha_vencimiento)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {LABEL_TIPO_INSTRUMENTO[i.tipo_instrumento]}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_REGULATORIO[i.estado_regulatorio]}`}
                  >
                    {LABEL_REGULATORIO[i.estado_regulatorio]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_ESTADO[i.estado]}`}
                  >
                    {LABEL_ESTADO[i.estado]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversiones/${i.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
                    aria-label="Acciones"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-svi-muted-2">
      {children}
    </th>
  );
}
