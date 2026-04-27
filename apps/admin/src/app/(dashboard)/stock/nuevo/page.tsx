import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSucursales } from "@/modules/stock/queries";
import { NewVehiculoForm } from "./new-vehiculo-form";

export const metadata = { title: "Nuevo vehículo" };

export default async function NewStockPage() {
  const sucursales = await getSucursales();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/stock"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Inventario · alta
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nuevo vehículo
          </h1>
        </div>
      </header>

      <NewVehiculoForm sucursales={sucursales} />
    </div>
  );
}
