import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import { getInversores, getInversoresCount } from "@/modules/inversores/queries";
import { inversorFiltersSchema } from "@/modules/inversores/schemas";
import { InversoresTable } from "./inversores-table";
import { InversoresFilters } from "./inversores-filters";

export const metadata = { title: "Inversores" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InversoresPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = inversorFiltersSchema.parse(params);

  const [inversores, total] = await Promise.all([
    getInversores(filters),
    getInversoresCount(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · captación de capital
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Inversores{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {total} registrados
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            Personas que aportan capital al fondo. Las inversiones activas se
            gestionan desde el módulo Inversiones.
          </p>
        </div>
        <Link href="/inversores/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo inversor
          </Button>
        </Link>
      </header>

      <InversoresFilters currentFilters={filters} />

      {inversores.length === 0 ? (
        <EmptyState />
      ) : (
        <InversoresTable items={inversores} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <Wallet className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin inversores registrados
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        No hay resultados con los filtros actuales. Ajustá los filtros o cargá un
        inversor nuevo para empezar a registrar aportes.
      </p>
      <Link href="/inversores/nuevo" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Cargar primer inversor
        </Button>
      </Link>
    </div>
  );
}
