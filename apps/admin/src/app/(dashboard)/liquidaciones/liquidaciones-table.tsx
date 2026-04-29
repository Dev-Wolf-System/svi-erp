import Link from "next/link";
import { formatCurrency, formatPercent, formatDate } from "@repo/utils";
import {
  LABEL_ESTADO,
  COLOR_ESTADO,
  LABEL_METODO_PAGO,
  type MetodoPago,
} from "@/modules/liquidaciones-inversion/schemas";
import type { LiquidacionListRow } from "@/modules/liquidaciones-inversion/queries";
import { LiquidacionRowActions } from "./liquidacion-row-actions";

export function LiquidacionesTable({ items }: { items: LiquidacionListRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Período</Th>
              <Th>Inversor / Contrato</Th>
              <Th>Capital base</Th>
              <Th>Tasa</Th>
              <Th>Interés</Th>
              <Th>Estado</Th>
              <Th>Pago</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((l) => (
              <tr key={l.id} className="hover:bg-svi-elevated/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">
                  {formatPeriodo(l.periodo)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversiones/${l.inversion.id}`}
                    className="block text-sm text-svi-white hover:text-svi-gold truncate max-w-[200px]"
                  >
                    {l.inversion.inversor.nombre}
                  </Link>
                  <span className="block text-[10px] font-mono text-svi-muted-2">
                    {l.inversion.numero_contrato}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-svi-muted">
                  {formatCurrency(Number(l.capital_base), l.moneda as "ARS" | "USD")}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-svi-muted">
                  {formatPercent(Number(l.tasa_aplicada), 2)}
                </td>
                <td className="px-4 py-3 font-mono text-svi-gold">
                  {formatCurrency(Number(l.monto_interes), l.moneda as "ARS" | "USD")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_ESTADO[l.estado]}`}
                  >
                    {LABEL_ESTADO[l.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {l.fecha_pago ? (
                    <>
                      <span className="block">{formatDate(l.fecha_pago)}</span>
                      {l.metodo_pago && (
                        <span className="block text-[10px] text-svi-muted-2">
                          {LABEL_METODO_PAGO[l.metodo_pago as MetodoPago] ?? l.metodo_pago}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-svi-disabled">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <LiquidacionRowActions liquidacion={l} />
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

function formatPeriodo(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${meses[Number(m[2]) - 1]} ${m[1]}`;
}
