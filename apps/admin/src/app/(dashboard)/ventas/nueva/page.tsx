import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSucursales, getVehiculos } from "@/modules/stock/queries";
import { getClientes } from "@/modules/clientes/queries";
import { getBancosActivos } from "@/modules/bancos/queries";
import { NewVentaForm } from "./new-venta-form";

export const metadata = { title: "Nueva venta" };

export default async function NewVentaPage() {
  const [sucursales, vehiculosRaw, clientes, bancos] = await Promise.all([
    getSucursales(),
    getVehiculos({ limit: 100 }),
    getClientes({ limit: 100 }),
    getBancosActivos(),
  ]);

  const vehiculos = vehiculosRaw
    .filter((v) => v.estado === "stock" || v.estado === "reservado")
    .map((v) => ({
      id: v.id,
      label: `${v.marca} ${v.modelo} ${v.anio} · ${v.patente ?? "s/p"}`,
      precio: Number(v.precio_venta),
      moneda: v.moneda,
      sucursal_id: v.sucursal_id,
    }));

  const clientesOptions = clientes.map((c) => ({
    id: c.id,
    label:
      c.tipo === "empresa"
        ? c.razon_social ?? c.nombre
        : [c.apellido, c.nombre].filter(Boolean).join(", ") || c.nombre,
  }));

  const bancosOptions = bancos.map((b) => ({
    id: b.id,
    label: b.nombre,
    tasa_sugerida: b.condiciones?.tasa_min ?? null,
    cuotas_sugeridas: b.condiciones?.cuotas_max ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/ventas"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Operación · alta
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nueva venta
          </h1>
        </div>
      </header>

      <NewVentaForm
        sucursales={sucursales}
        vehiculos={vehiculos}
        clientes={clientesOptions}
        bancos={bancosOptions}
      />
    </div>
  );
}
