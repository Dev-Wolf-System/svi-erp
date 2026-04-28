import Link from "next/link";
import { Building2, User, MoreVertical, Mail, Phone } from "lucide-react";
import { Badge } from "@repo/ui";
import { formatCuit, formatDni } from "@repo/utils";
import type { ClienteRow } from "@/modules/clientes/queries";

export function ClientesTable({ items }: { items: ClienteRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Cliente</Th>
              <Th>Identificación</Th>
              <Th>Contacto</Th>
              <Th>Ubicación</Th>
              <Th>Portal</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((c) => {
              const Icon = c.tipo === "empresa" ? Building2 : User;
              const displayName =
                c.tipo === "empresa"
                  ? c.razon_social ?? c.nombre
                  : [c.nombre, c.apellido].filter(Boolean).join(" ");
              return (
                <tr key={c.id} className="hover:bg-svi-elevated/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-svi-elevated text-svi-gold">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-medium text-svi-white">
                          {displayName || "—"}
                        </span>
                        <span className="block text-[11px] uppercase tracking-wider text-svi-muted-2">
                          {c.tipo}
                          {c.origen && ` · ${c.origen}`}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.cuit && (
                      <span className="block text-svi-gold">
                        CUIT {formatCuit(c.cuit)}
                      </span>
                    )}
                    {c.dni && (
                      <span className="block text-svi-muted">
                        DNI {formatDni(c.dni)}
                      </span>
                    )}
                    {!c.cuit && !c.dni && <span className="text-svi-disabled">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-svi-muted">
                    {c.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-svi-muted-2" />
                        {c.email}
                      </span>
                    )}
                    {(c.celular || c.telefono) && (
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono">
                        <Phone className="h-3 w-3 text-svi-muted-2" />
                        {c.celular ?? c.telefono}
                      </span>
                    )}
                    {!c.email && !c.celular && !c.telefono && (
                      <span className="text-svi-disabled">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-svi-muted-2">
                    {[c.localidad, c.provincia].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.portal_activo ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <span className="text-xs text-svi-disabled">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
                      aria-label="Acciones"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
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
