"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@repo/utils";
import type { EstadoVenta } from "@/modules/ventas/schemas";
import type { VentaListRow } from "@/modules/ventas/queries";
import { VentasKanban } from "./ventas-kanban";
import { VentasList } from "./ventas-list";

type Mode = "kanban" | "list";

export function VentasView({ grupos }: { grupos: Record<EstadoVenta, VentaListRow[]> }) {
  const [mode, setMode] = useState<Mode>("kanban");

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="shrink-0 flex justify-end">
        <div className="inline-flex rounded-lg border border-svi-border-muted bg-svi-card/50 p-0.5">
          <ToggleButton
            active={mode === "kanban"}
            onClick={() => setMode("kanban")}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label="Kanban"
          />
          <ToggleButton
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<List className="h-3.5 w-3.5" />}
            label="Lista"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {mode === "kanban" ? (
          <VentasKanban grupos={grupos} />
        ) : (
          <VentasList grupos={grupos} />
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-svi-gold/15 text-svi-gold"
          : "text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
