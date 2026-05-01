import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { getSucursalesAccesibles } from "@/modules/caja/queries";
import { NuevoMovimientoForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registrar movimiento · Caja · SVI",
};

export default async function NuevoMovimientoPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("caja.registrar", claims.rol)) redirect("/caja");

  const sucursales = await getSucursalesAccesibles();
  if (sucursales.length === 0) {
    redirect("/caja");
  }

  // Por ahora usamos la primera sucursal accesible.
  // TODO: selector de sucursal si hay más de una (multi-sucursal).
  const sucursal = sucursales[0]!;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/caja"
          className="p-2 rounded-lg hover:bg-svi-elevated transition text-svi-muted hover:text-svi-white"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-svi-white">Registrar movimiento</h1>
          <p className="text-sm text-svi-muted mt-0.5">Ingresá los datos del movimiento de caja</p>
        </div>
      </div>

      <div className="bg-svi-card border border-svi-border-muted rounded-2xl p-6">
        <NuevoMovimientoForm
          sucursalId={sucursal.id}
          sucursalNombre={sucursal.nombre}
        />
      </div>
    </div>
  );
}
