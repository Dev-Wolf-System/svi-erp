import Link from "next/link";
import { Building2, Mail, Phone, MoreVertical } from "lucide-react";
import { Badge } from "@repo/ui";
import { formatPercent } from "@repo/utils";
import type { BancoRow } from "@/modules/bancos/queries";

export function BancosTable({ items }: { items: BancoRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Banco</Th>
              <Th>Contacto</Th>
              <Th>Tasa (TNA)</Th>
              <Th>Cuotas</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-svi-elevated/40 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/bancos/${b.id}`} className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-svi-elevated text-svi-gold">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="block font-medium text-svi-white">{b.nombre}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  {b.contacto && (
                    <span className="block text-svi-white">{b.contacto}</span>
                  )}
                  {b.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-svi-muted-2" />
                      {b.email}
                    </span>
                  )}
                  {b.telefono && (
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono">
                      <Phone className="h-3 w-3 text-svi-muted-2" />
                      {b.telefono}
                    </span>
                  )}
                  {!b.contacto && !b.email && !b.telefono && (
                    <span className="text-svi-disabled">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  <TasaCell condiciones={b.condiciones} />
                </td>
                <td className="px-4 py-3 text-xs text-svi-muted">
                  <CuotasCell condiciones={b.condiciones} />
                </td>
                <td className="px-4 py-3">
                  {b.activo ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <span className="text-xs text-svi-disabled">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/bancos/${b.id}`}
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

function TasaCell({ condiciones }: { condiciones: BancoRow["condiciones"] }) {
  const min = condiciones?.tasa_min;
  const max = condiciones?.tasa_max;
  if (min == null && max == null) return <span className="text-svi-disabled">—</span>;
  if (min != null && max != null && min !== max) {
    return (
      <span className="font-mono">
        {formatPercent(min, 1)} – {formatPercent(max, 1)}
      </span>
    );
  }
  return <span className="font-mono">{formatPercent(min ?? max ?? 0, 1)}</span>;
}

function CuotasCell({ condiciones }: { condiciones: BancoRow["condiciones"] }) {
  const min = condiciones?.cuotas_min;
  const max = condiciones?.cuotas_max;
  if (min == null && max == null) return <span className="text-svi-disabled">—</span>;
  if (min != null && max != null && min !== max) return <span>{min} – {max}</span>;
  return <span>{min ?? max} cuotas</span>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-svi-muted-2">
      {children}
    </th>
  );
}
