import Link from "next/link";
import { Plus, PackageX } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import { getStockCount, getSucursales, getVehiculos } from "@/modules/stock/queries";
import { vehiculoFiltersSchema } from "@/modules/stock";
import { StockFilters } from "./stock-filters";
import { StockView } from "./stock-view";

export const metadata = { title: "Stock" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StockPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = vehiculoFiltersSchema.parse(params);
  const view = params.view === "tabla" ? "tabla" : "grilla";

  const [vehiculos, total, sucursales] = await Promise.all([
    getVehiculos(filters),
    getStockCount(),
    getSucursales(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Inventario
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Stock <Badge variant="default" className="ml-2 align-middle">{total} unidades</Badge>
          </h1>
        </div>
        <Link href="/stock/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo vehículo
          </Button>
        </Link>
      </header>

      <StockFilters
        sucursales={sucursales}
        currentView={view}
        currentFilters={filters}
      />

      {vehiculos.length === 0 ? (
        <EmptyState />
      ) : (
        <StockView vehiculos={vehiculos} view={view} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <PackageX className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin vehículos en stock
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        No encontramos resultados con los filtros actuales. Ajustá los filtros o
        ingresá un vehículo nuevo.
      </p>
      <Link href="/stock/nuevo" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Cargar primer vehículo
        </Button>
      </Link>
    </div>
  );
}
