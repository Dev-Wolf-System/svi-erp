import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import { getVentasGroupedByEstado, getVentasCount } from "@/modules/ventas/queries";
import { VentasKanban } from "./ventas-kanban";

export const metadata = { title: "Ventas" };

export default async function VentasPage() {
  const [grupos, counts] = await Promise.all([
    getVentasGroupedByEstado(),
    getVentasCount(),
  ]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Operación · pipeline
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Ventas{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {counts.total} en proceso
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            El estado se cambia desde el detalle de cada operación.
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button>
            <Plus className="h-4 w-4" />
            Nueva venta
          </Button>
        </Link>
      </header>

      {counts.total === 0 ? <EmptyState /> : <VentasKanban grupos={grupos} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <ShoppingCart className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin ventas todavía
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        Cuando registres la primera operación aparece acá organizada por estado.
      </p>
      <Link href="/ventas/nueva" className="inline-block mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Cargar primera venta
        </Button>
      </Link>
    </div>
  );
}
