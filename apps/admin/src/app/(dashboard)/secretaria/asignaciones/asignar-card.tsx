"use client";

import { useState, useTransition } from "react";
import { User, Phone, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { asignarVendedor } from "@/modules/leads/actions";
import type { LeadRow } from "@/modules/leads/queries";

interface Vendedor {
  id: string;
  nombre: string;
  color: string;
}

interface AsignarCardProps {
  lead: LeadRow;
  vendedores: Vendedor[];
}

export function AsignarCard({ lead, vendedores }: AsignarCardProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleAsignar(vendedorId: string | null) {
    startTransition(async () => {
      const res = await asignarVendedor({ id: lead.id, vendedor_id: vendedorId });
      if (res.ok) {
        toast.success(
          vendedorId
            ? `Lead asignado correctamente`
            : "Lead desasignado",
        );
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const vendedorActual = vendedores.find((v) => v.id === lead.vendedor_id);

  return (
    <div className="bg-svi-elevated rounded-lg p-3 border border-svi-border-muted space-y-2">
      {/* Nombre */}
      <div className="flex items-start gap-2">
        <User className="h-4 w-4 text-svi-muted mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-svi-white leading-tight">
          {lead.nombre ?? "Sin nombre"}
        </p>
      </div>

      {/* Teléfono */}
      {lead.telefono && (
        <a
          href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-svi-muted hover:text-svi-white transition-colors"
        >
          <Phone className="h-3 w-3" />
          {lead.telefono}
        </a>
      )}

      {/* Origen */}
      {lead.origen && (
        <p className="text-xs text-svi-muted">
          Origen: <span className="text-svi-white">{lead.origen}</span>
        </p>
      )}

      {/* Selector de vendedor */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={isPending}
          className="w-full flex items-center justify-between gap-2 bg-svi-card rounded-md px-3 py-1.5 text-xs border border-svi-border-muted hover:border-svi-gold transition-colors disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {vendedorActual ? (
              <>
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: vendedorActual.color }}
                />
                <span className="text-svi-white">{vendedorActual.nombre}</span>
              </>
            ) : (
              <span className="text-svi-muted">Sin asignar</span>
            )}
          </span>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-svi-muted" />
          ) : (
            <ChevronDown className="h-3 w-3 text-svi-muted" />
          )}
        </button>

        {open && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-svi-card border border-svi-border-muted rounded-md shadow-lg overflow-hidden">
            <li>
              <button
                type="button"
                onClick={() => handleAsignar(null)}
                className="w-full text-left px-3 py-2 text-xs text-svi-muted hover:bg-svi-elevated hover:text-svi-white transition-colors"
              >
                Sin asignar
              </button>
            </li>
            {vendedores.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handleAsignar(v.id)}
                  className="w-full text-left px-3 py-2 text-xs text-svi-white hover:bg-svi-elevated transition-colors flex items-center gap-2"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: v.color }}
                  />
                  {v.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Agendar turno */}
      <a
        href={`/agenda/turnos/nuevo?persona_id=${lead.id}&persona_tipo=lead`}
        className="block text-center text-xs text-svi-gold hover:underline pt-1"
      >
        + Agendar turno
      </a>
    </div>
  );
}
