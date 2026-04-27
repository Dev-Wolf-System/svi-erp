import Link from "next/link";
import Image from "next/image";
import { Fuel, Gauge, MoreVertical } from "lucide-react";
import { EstadoVehiculoBadge } from "@repo/ui";
import { formatCurrency, formatNumber } from "@repo/utils";
import type { VehiculoRow } from "@/modules/stock/queries";

interface Props {
  vehiculos: VehiculoRow[];
  view: "tabla" | "grilla";
}

export function StockView({ vehiculos, view }: Props) {
  return view === "grilla" ? <Grid items={vehiculos} /> : <Table items={vehiculos} />;
}

function Grid({ items }: { items: VehiculoRow[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((v) => (
        <Link
          key={v.id}
          href={`/stock/${v.id}`}
          className="group relative overflow-hidden rounded-xl border border-svi-border-muted bg-svi-card transition-all hover:border-svi-gold/40 hover:-translate-y-0.5"
        >
          <div className="relative aspect-[16/10] bg-svi-dark">
            {v.foto_principal_url ? (
              <Image
                src={v.foto_principal_url}
                alt={`${v.marca} ${v.modelo}`}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-svi-muted-2 text-xs">
                Sin foto
              </div>
            )}
            <div className="absolute top-2 left-2">
              <EstadoVehiculoBadge estado={v.estado} />
            </div>
            <div className="absolute top-2 right-2">
              <span className="inline-flex rounded-full bg-svi-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-svi-muted backdrop-blur-md">
                {v.condicion === "0km" ? "0 km" : v.condicion}
              </span>
            </div>
          </div>

          <div className="p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-svi-gold/80">
              {v.marca}
            </p>
            <h3 className="mt-1 font-display text-base font-semibold text-svi-white truncate">
              {v.modelo}
              {v.version && <span className="text-svi-muted-2 font-normal"> · {v.version}</span>}
            </h3>

            <div className="mt-3 flex items-center gap-3 text-[11px] text-svi-muted-2">
              <span className="font-mono">{v.anio}</span>
              {v.kilometraje !== null && (
                <span className="inline-flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> {formatNumber(v.kilometraje, 0)} km
                </span>
              )}
              {v.combustible && (
                <span className="inline-flex items-center gap-1">
                  <Fuel className="h-3 w-3" /> {v.combustible}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between">
              <p className="font-display text-lg font-bold text-svi-gold tabular-nums">
                {formatCurrency(v.precio_venta, v.moneda as "ARS" | "USD")}
              </p>
              <span className="text-[10px] font-mono text-svi-muted-2">
                {v.sucursal.codigo}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Table({ items }: { items: VehiculoRow[] }) {
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted">
              <Th>Foto</Th>
              <Th>Vehículo</Th>
              <Th>Patente</Th>
              <Th>Año</Th>
              <Th>Tipo</Th>
              <Th>Estado</Th>
              <Th>Sucursal</Th>
              <Th align="right">Precio</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-svi-border-muted">
            {items.map((v) => (
              <tr key={v.id} className="hover:bg-svi-elevated/40 transition-colors">
                <td className="px-4 py-2">
                  <Link
                    href={`/stock/${v.id}`}
                    className="block relative h-10 w-16 overflow-hidden rounded-md bg-svi-dark"
                  >
                    {v.foto_principal_url ? (
                      <Image
                        src={v.foto_principal_url}
                        alt={v.modelo}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[9px] text-svi-muted-2">
                        sin foto
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/stock/${v.id}`} className="block">
                    <span className="font-medium text-svi-white">{v.marca} {v.modelo}</span>
                    {v.version && <span className="block text-xs text-svi-muted-2">{v.version}</span>}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-svi-gold">{v.patente ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-svi-muted">{v.anio}</td>
                <td className="px-4 py-2 text-svi-muted-2 capitalize">{v.tipo}</td>
                <td className="px-4 py-2">
                  <EstadoVehiculoBadge estado={v.estado} />
                </td>
                <td className="px-4 py-2 text-xs text-svi-muted-2">{v.sucursal.nombre}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-svi-gold">
                  {formatCurrency(v.precio_venta, v.moneda as "ARS" | "USD")}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/stock/${v.id}`}
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

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
