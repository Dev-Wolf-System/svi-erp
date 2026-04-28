import Link from "next/link";
import { User, MoreVertical, Mail, Phone, Landmark } from "lucide-react";
import { Badge } from "@repo/ui";
import { formatCuit, formatDni } from "@repo/utils";
import type { InversorRow } from "@/modules/inversores/queries";

export function InversoresTable({ items }: { items: InversorRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Inversor</Th>
              <Th>Identificación</Th>
              <Th>Contacto</Th>
              <Th>Banco</Th>
              <Th>Portal</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-svi-elevated/40 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/inversores/${i.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-svi-elevated text-svi-gold">
                      <User className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-medium text-svi-white">
                        {i.nombre || "—"}
                      </span>
                      {i.cliente_id && (
                        <span className="block text-[11px] uppercase tracking-wider text-svi-muted-2">
                          También cliente
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {i.cuit && (
                    <span className="block text-svi-gold">
                      CUIT {formatCuit(i.cuit)}
                    </span>
                  )}
                  {i.dni && (
                    <span className="block text-svi-muted">
                      DNI {formatDni(i.dni)}
                    </span>
                  )}
                  {!i.cuit && !i.dni && <span className="text-svi-disabled">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {i.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-svi-muted-2" />
                      {i.email}
                    </span>
                  )}
                  {i.telefono && (
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono">
                      <Phone className="h-3 w-3 text-svi-muted-2" />
                      {i.telefono}
                    </span>
                  )}
                  {!i.email && !i.telefono && (
                    <span className="text-svi-disabled">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {i.banco_nombre ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Landmark className="h-3 w-3 text-svi-muted-2" />
                      {i.banco_nombre}
                    </span>
                  ) : (
                    <span className="text-svi-disabled">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {i.portal_activo ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <span className="text-xs text-svi-disabled">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/inversores/${i.id}`}
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
