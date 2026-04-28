import Link from "next/link";
import { Receipt, CreditCard, FileSignature } from "lucide-react";
import { formatCurrency, formatRelative } from "@repo/utils";
import {
  ESTADOS_VENTA,
  LABEL_ESTADO,
  COLOR_ESTADO,
  type EstadoVenta,
} from "@/modules/ventas/schemas";
import type { VentaListRow } from "@/modules/ventas/queries";

interface Props {
  grupos: Record<EstadoVenta, VentaListRow[]>;
}

export function VentasKanban({ grupos }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {ESTADOS_VENTA.map((estado) => {
        const items = grupos[estado] ?? [];
        return (
          <section
            key={estado}
            className={`rounded-xl border bg-svi-card/30 ${COLOR_ESTADO[estado]} flex flex-col min-h-[400px]`}
          >
            <header className="px-3 py-2.5 border-b border-current/20 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider">
                {LABEL_ESTADO[estado]}
              </span>
              <span className="text-xs font-bold">{items.length}</span>
            </header>
            <ul className="flex-1 p-2 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <li className="text-center text-xs text-svi-muted-2 py-6">
                  Sin operaciones
                </li>
              ) : (
                items.map((v) => <VentaCard key={v.id} venta={v} />)
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function VentaCard({ venta }: { venta: VentaListRow }) {
  const cliente =
    venta.cliente.tipo === "empresa"
      ? venta.cliente.razon_social ?? venta.cliente.nombre
      : [venta.cliente.nombre, venta.cliente.apellido].filter(Boolean).join(" ");

  return (
    <li>
      <Link
        href={`/ventas/${venta.id}`}
        className="block rounded-lg border border-svi-border-muted bg-svi-dark p-3 hover:border-svi-gold transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] text-svi-gold">
            {venta.numero_operacion}
          </span>
          <span className="text-[10px] text-svi-muted-2">
            {formatRelative(venta.created_at)}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-svi-white truncate">
          {venta.vehiculo.marca} {venta.vehiculo.modelo}{" "}
          <span className="text-svi-muted-2">{venta.vehiculo.anio}</span>
        </p>
        <p className="text-xs text-svi-muted truncate">{cliente || "—"}</p>
        <p className="mt-2 text-sm font-mono text-svi-white">
          {formatCurrency(Number(venta.precio_final), venta.moneda as "ARS" | "USD")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {venta.cae && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-success/15 text-svi-success">
              <Receipt className="h-2.5 w-2.5" />
              CAE
            </span>
          )}
          {venta.mp_payment_id && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-info/15 text-svi-info">
              <CreditCard className="h-2.5 w-2.5" />
              MP
            </span>
          )}
          {venta.contrato_url && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-gold/15 text-svi-gold">
              <FileSignature className="h-2.5 w-2.5" />
              PDF
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
