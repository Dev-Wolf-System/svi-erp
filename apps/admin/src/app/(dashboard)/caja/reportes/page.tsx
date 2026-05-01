import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { getSucursalesAccesibles } from "@/modules/caja/queries";
import { ReportesShell } from "./reportes-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reportes · Caja · SVI",
};

export default async function ReportesCajaPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("caja.view_propia", claims.rol)) redirect("/dashboard");

  const sucursales = await getSucursalesAccesibles();
  if (sucursales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-svi-muted">
        <FileText className="size-10 mb-3 opacity-30" />
        <p className="text-sm">No hay sucursales disponibles.</p>
      </div>
    );
  }

  // Single-sucursal: usa la primera. Multi-sucursal: TODO selector (consistente con dashboard caja).
  const sucursal = sucursales[0]!;
  const puedeIa = can("ia.report", claims.rol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/caja"
            className="inline-flex items-center gap-1 text-xs text-svi-muted hover:text-svi-white transition mb-2"
          >
            <ArrowLeft className="size-3" />
            Caja
          </Link>
          <h1 className="text-2xl font-bold text-svi-white flex items-center gap-2">
            <FileText className="size-6 text-svi-gold" />
            Reportes
          </h1>
          <p className="text-sm text-svi-muted mt-1">
            {sucursal.nombre} · Arqueo del día, cierre mensual y export CSV
          </p>
        </div>
      </div>

      <ReportesShell
        sucursalId={sucursal.id}
        sucursalNombre={sucursal.nombre}
        puedeIa={puedeIa}
      />
    </div>
  );
}
