"use client";

import Link from "next/link";
import { Receipt, CreditCard, FileSignature } from "lucide-react";
import { cn, formatCurrency, formatRelative } from "@repo/utils";
import {
  ESTADOS_VENTA,
  LABEL_ESTADO,
  COLOR_ESTADO,
  type EstadoVenta,
} from "@/modules/ventas/schemas";
import type { VentaListRow } from "@/modules/ventas/queries";

export function VentasList({
  grupos,
}: {
  grupos: Record<EstadoVenta, VentaListRow[]>;
}) {
  const all = ESTADOS_VENTA.flatMap((e) => grupos[e] ?? []).sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-svi-border-muted p-10 text-center text-sm text-svi-muted-2">
        Sin ventas en ningún estado.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-xl border border-svi-border-muted bg-svi-card/30">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-svi-dark/95 backdrop-blur text-[10px] uppercase tracking-wider text-svi-muted-2">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium">N° operación</th>
            <th className="px-3 py-2.5 text-left font-medium">Vehículo</th>
            <th className="px-3 py-2.5 text-left font-medium">Cliente</th>
            <th className="px-3 py-2.5 text-right font-medium">Precio</th>
            <th className="px-3 py-2.5 text-left font-medium">Estado</th>
            <th className="px-3 py-2.5 text-left font-medium">Docs</th>
            <th className="px-3 py-2.5 text-right font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-svi-border-muted/40">
          {all.map((v) => {
            const cliente =
              v.cliente.tipo === "empresa"
                ? v.cliente.razon_social ?? v.cliente.nombre
                : [v.cliente.nombre, v.cliente.apellido].filter(Boolean).join(" ");

            return (
              <tr
                key={v.id}
                className="group hover:bg-svi-elevated/40 transition-colors"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="font-mono text-xs text-svi-gold hover:underline"
                  >
                    {v.numero_operacion}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-svi-white">
                  <span className="font-medium">
                    {v.vehiculo.marca} {v.vehiculo.modelo}
                  </span>{" "}
                  <span className="text-svi-muted-2">{v.vehiculo.anio}</span>
                  {v.vehiculo.patente && (
                    <span className="ml-1 font-mono text-[10px] text-svi-muted-2">
                      ({v.vehiculo.patente})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-svi-muted truncate max-w-[180px]">
                  {cliente || "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-svi-white">
                  {formatCurrency(Number(v.precio_final), v.moneda as "ARS" | "USD")}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider",
                      COLOR_ESTADO[v.estado],
                    )}
                  >
                    {LABEL_ESTADO[v.estado]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {v.cae && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-success/15 text-svi-success">
                        <Receipt className="h-2.5 w-2.5" />
                        CAE
                      </span>
                    )}
                    {v.mp_payment_id && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-info/15 text-svi-info">
                        <CreditCard className="h-2.5 w-2.5" />
                        MP
                      </span>
                    )}
                    {v.contrato_url && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-gold/15 text-svi-gold">
                        <FileSignature className="h-2.5 w-2.5" />
                        PDF
                      </span>
                    )}
                    {!v.cae && !v.mp_payment_id && !v.contrato_url && (
                      <span className="text-svi-muted-2">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-svi-muted-2">
                  {formatRelative(v.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
