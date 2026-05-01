import { redirect } from "next/navigation";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getLeadsParaAsignacion } from "@/modules/secretaria/queries";
import { AsignarCard } from "./asignar-card";

export const metadata = { title: "Asignaciones — SVI ERP" };

export default async function AsignacionesPage() {
  const claims = await getSviClaims();
  if (!claims || !can("leads.assign", claims.rol)) redirect("/secretaria");

  const { sinAsignar, porVendedor, vendedores } = await getLeadsParaAsignacion();

  const columns = [
    { id: "sin-asignar", label: "Sin asignar", leads: sinAsignar, color: "#6B7280" },
    ...vendedores.map((v) => ({
      id: v.id,
      label: v.nombre,
      leads: porVendedor[v.id] ?? [],
      color: v.color,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-svi-white">Asignaciones</h1>
        <p className="text-sm text-svi-muted mt-0.5">
          Asignación de leads a vendedores
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="w-64 shrink-0">
            {/* Header columna */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <h3 className="text-sm font-medium text-svi-white">{col.label}</h3>
              <span className="ml-auto text-xs text-svi-muted bg-svi-elevated rounded-full px-2 py-0.5">
                {col.leads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px]">
              {col.leads.length === 0 ? (
                <div className="border border-dashed border-svi-border-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-svi-muted">Sin leads</p>
                </div>
              ) : (
                col.leads.map((lead) => (
                  <AsignarCard
                    key={lead.id}
                    lead={lead}
                    vendedores={vendedores}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
