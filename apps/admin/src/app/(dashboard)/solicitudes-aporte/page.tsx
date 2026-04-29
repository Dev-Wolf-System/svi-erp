import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge } from "@repo/ui";
import {
  getSolicitudesAporte,
  getSolicitudesPendientesCount,
} from "@/modules/solicitudes-aporte/queries";
import { SolicitudesTable } from "./solicitudes-table";

export const metadata = { title: "Solicitudes de aporte" };

export default async function SolicitudesAportePage() {
  const [solicitudes, pendientesCount] = await Promise.all([
    getSolicitudesAporte(),
    getSolicitudesPendientesCount(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · entrada del portal
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Solicitudes de aporte{" "}
            <Badge variant="warning" className="ml-2 align-middle">
              {pendientesCount} pendientes
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            Pedidos de aporte adicional que llegan desde el portal del inversor.
            Confirmá cuando recibas la transferencia o rechazá con motivo.
          </p>
        </div>
        <Link
          href="/inversiones"
          className="text-sm text-svi-muted-2 hover:text-svi-white"
        >
          Ver inversiones →
        </Link>
      </header>

      {solicitudes.length === 0 ? (
        <EmptyState />
      ) : (
        <SolicitudesTable items={solicitudes} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <Inbox className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin solicitudes
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        Cuando un inversor solicite un aporte adicional desde el portal,
        aparecerá acá para que confirmes la transferencia recibida.
      </p>
    </div>
  );
}
