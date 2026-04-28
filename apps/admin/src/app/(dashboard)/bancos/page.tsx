import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import { getBancos, getBancosCount } from "@/modules/bancos/queries";
import { bancoFiltersSchema } from "@/modules/bancos";
import { BancosTable } from "./bancos-table";
import { BancosFilters } from "./bancos-filters";

export const metadata = { title: "Bancos" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BancosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = bancoFiltersSchema.parse(params);

  const [bancos, counts] = await Promise.all([getBancos(filters), getBancosCount()]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Gestión · Financieras
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Bancos{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {counts.activos} activos · {counts.total} totales
            </Badge>
          </h1>
        </div>
        <Link href="/bancos/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo banco
          </Button>
        </Link>
      </header>

      <BancosFilters currentFilters={filters} />

      {bancos.length === 0 ? (
        <EmptyState />
      ) : (
        <BancosTable items={bancos} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <Building2 className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin bancos cargados
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        Cargá los bancos con los que trabaja la concesionaria para que aparezcan
        como opción de financiación al cargar una venta.
      </p>
      <Link href="/bancos/nuevo" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Cargar primer banco
        </Button>
      </Link>
    </div>
  );
}
