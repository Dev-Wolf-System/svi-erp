import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import {
  getInversiones,
  getInversionesCount,
} from "@/modules/inversiones/queries";
import { inversionFiltersSchema } from "@/modules/inversiones/schemas";
import { InversionesFilters } from "./inversiones-filters";
import { InversionesTable } from "./inversiones-table";

export const metadata = { title: "Inversiones" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InversionesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = inversionFiltersSchema.parse(params);

  const [inversiones, counts] = await Promise.all([
    getInversiones(filters),
    getInversionesCount(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · capital activo
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Inversiones{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {counts.activa} activas
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            Aportes activos del fondo. Cada cambio de tasa queda registrado en
            el historial inmutable.
          </p>
        </div>
        <Link href="/inversiones/nueva">
          <Button>
            <Plus className="h-4 w-4" />
            Nueva inversión
          </Button>
        </Link>
      </header>

      <InversionesFilters currentFilters={filters} />

      {inversiones.length === 0 ? (
        <EmptyState />
      ) : (
        <InversionesTable items={inversiones} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <TrendingUp className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin inversiones registradas
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        Cuando un inversor aporte capital, registrá la inversión acá para
        empezar a generar liquidaciones mensuales.
      </p>
      <Link href="/inversiones/nueva" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Registrar primera inversión
        </Button>
      </Link>
    </div>
  );
}
