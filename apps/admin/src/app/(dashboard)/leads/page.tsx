import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@repo/ui";
import { getLeads, getLeadsCount } from "@/modules/leads/queries";
import { KanbanBoard } from "./kanban-board";
import { NewLeadButton } from "./new-lead-button";

export const metadata = { title: "Pipeline de leads" };

export default async function LeadsPage() {
  const [leads, total] = await Promise.all([getLeads(), getLeadsCount()]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] gap-5">
      <header className="shrink-0 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/clientes"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver a clientes"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              CRM · pipeline
            </p>
            <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-svi-white">
              Leads{" "}
              <Badge variant="default" className="ml-2 align-middle">
                {total} totales
              </Badge>
            </h1>
            <p className="mt-1 text-sm text-svi-muted-2">
              Arrastrá las tarjetas entre columnas para cambiar el estado.
            </p>
          </div>
        </div>
        <NewLeadButton />
      </header>

      <div className="flex-1 min-h-0">
        <KanbanBoard initial={leads} />
      </div>
    </div>
  );
}
