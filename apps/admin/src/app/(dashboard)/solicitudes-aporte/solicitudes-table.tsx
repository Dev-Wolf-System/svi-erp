import Link from "next/link";
import { formatCurrency, formatDate, formatRelative } from "@repo/utils";
import {
  LABEL_ESTADO_SOLICITUD,
  COLOR_ESTADO_SOLICITUD,
} from "@/modules/solicitudes-aporte/schemas";
import type { SolicitudAporteRow } from "@/modules/solicitudes-aporte/queries";
import { SolicitudRowActions } from "./solicitud-row-actions";

export function SolicitudesTable({ items }: { items: SolicitudAporteRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Solicitada</Th>
              <Th>Inversor</Th>
              <Th>Contrato</Th>
              <Th>Monto estimado</Th>
              <Th>Fecha estimada</Th>
              <Th>Motivo</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-svi-elevated/40 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-svi-muted-2">
                  {formatRelative(s.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversores/${s.inversor.id}`}
                    className="text-sm text-svi-white hover:text-svi-gold"
                  >
                    {s.inversor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversiones/${s.inversion.id}`}
                    className="font-mono text-xs text-svi-gold hover:underline"
                  >
                    {s.inversion.numero_contrato}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-svi-white">
                  {formatCurrency(
                    Number(s.monto_estimado),
                    s.moneda as "ARS" | "USD",
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {formatDate(s.fecha_estimada)}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted truncate max-w-[200px]">
                  {s.motivo ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_ESTADO_SOLICITUD[s.estado]}`}
                  >
                    {LABEL_ESTADO_SOLICITUD[s.estado]}
                  </span>
                  {s.motivo_rechazo && (
                    <p className="mt-1 text-[10px] text-svi-error">
                      {s.motivo_rechazo}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <SolicitudRowActions solicitud={s} />
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
