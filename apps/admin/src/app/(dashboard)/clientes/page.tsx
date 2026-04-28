import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import {
  getClientes,
  getClientesCount,
  getProvinciasDistintas,
} from "@/modules/clientes/queries";
import { clienteFiltersSchema } from "@/modules/clientes";
import { ClientesFilters } from "./clientes-filters";
import { ClientesTable } from "./clientes-table";

export const metadata = { title: "Clientes" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = clienteFiltersSchema.parse(params);

  const [clientes, total, provincias] = await Promise.all([
    getClientes(filters),
    getClientesCount(),
    getProvinciasDistintas(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            CRM
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Clientes{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {total} registrados
            </Badge>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="ghost">Pipeline de leads</Button>
          </Link>
          <Link href="/clientes/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </Link>
        </div>
      </header>

      <ClientesFilters provincias={provincias} currentFilters={filters} />

      {clientes.length === 0 ? (
        <EmptyState />
      ) : (
        <ClientesTable items={clientes} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <UsersRound className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin clientes registrados
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        No encontramos resultados con los filtros actuales. Ajustá los filtros o
        cargá un cliente nuevo.
      </p>
      <Link href="/clientes/nuevo" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Cargar primer cliente
        </Button>
      </Link>
    </div>
  );
}
