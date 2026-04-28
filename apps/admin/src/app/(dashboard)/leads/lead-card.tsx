import { Mail, Phone, MessageSquare, Clock } from "lucide-react";
import { formatDate } from "@repo/utils";
import type { LeadRow } from "@/modules/leads/queries";

export function LeadCard({ lead }: { lead: LeadRow }) {
  const initial = (lead.nombre ?? "?").trim().charAt(0).toUpperCase();
  return (
    <article className="group rounded-lg border border-svi-border-muted bg-svi-card p-3 hover:border-svi-gold/40 transition-colors shadow-sm">
      <header className="flex items-start gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-svi-elevated text-svi-gold text-sm font-semibold">
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-svi-white truncate">
            {lead.nombre ?? "Sin nombre"}
          </h3>
          {lead.origen && (
            <p className="text-[10px] uppercase tracking-wider text-svi-muted-2 mt-0.5">
              {lead.origen}
            </p>
          )}
        </div>
      </header>

      {(lead.email || lead.telefono) && (
        <div className="mt-2 space-y-1 text-[11px] text-svi-muted">
          {lead.email && (
            <p className="inline-flex items-center gap-1.5 truncate w-full">
              <Mail className="h-3 w-3 text-svi-muted-2 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}
          {lead.telefono && (
            <p className="inline-flex items-center gap-1.5 font-mono">
              <Phone className="h-3 w-3 text-svi-muted-2" />
              {lead.telefono}
            </p>
          )}
        </div>
      )}

      {lead.mensaje && (
        <p className="mt-2 text-[11px] text-svi-muted line-clamp-2 inline-flex items-start gap-1.5">
          <MessageSquare className="h-3 w-3 mt-0.5 text-svi-muted-2 shrink-0" />
          <span>{lead.mensaje}</span>
        </p>
      )}

      <footer className="mt-3 pt-2 border-t border-svi-border-muted/40 flex items-center justify-between text-[10px] text-svi-muted-2">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(lead.updated_at)}
        </span>
      </footer>
    </article>
  );
}
