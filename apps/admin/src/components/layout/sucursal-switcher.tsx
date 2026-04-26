"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useSucursalStore } from "@/stores/sucursal-store";
import { cn } from "@repo/utils";

interface Props {
  sucursales: { id: string; nombre: string; codigo: string }[];
}

export function SucursalSwitcher({ sucursales }: Props) {
  const { sucursalActivaId, sucursalActivaNombre, setSucursal } = useSucursalStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sucursalActivaId && sucursales[0]) {
      setSucursal(sucursales[0].id, sucursales[0].nombre);
    }
  }, [sucursales, sucursalActivaId, setSucursal]);

  if (sucursales.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-svi-border-muted bg-svi-card px-3 py-2 text-sm text-svi-white hover:border-svi-gold/40 transition-colors"
      >
        <Building2 className="h-4 w-4 text-svi-gold" />
        <span className="font-medium">{sucursalActivaNombre ?? "Elegir sucursal"}</span>
        <ChevronDown className={cn("h-4 w-4 text-svi-muted-2 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute top-full mt-1 w-64 z-20 rounded-lg border border-svi-border-muted bg-svi-card shadow-card overflow-hidden">
            <ul className="py-1">
              {sucursales.map((s) => {
                const active = s.id === sucursalActivaId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-svi-elevated transition-colors",
                        active ? "text-svi-gold" : "text-svi-white",
                      )}
                      onClick={() => {
                        setSucursal(s.id, s.nombre);
                        setOpen(false);
                      }}
                    >
                      <span>
                        <span className="block">{s.nombre}</span>
                        <span className="block text-xs text-svi-muted-2 font-mono">
                          {s.codigo}
                        </span>
                      </span>
                      {active && <Check className="h-4 w-4 text-svi-gold" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
