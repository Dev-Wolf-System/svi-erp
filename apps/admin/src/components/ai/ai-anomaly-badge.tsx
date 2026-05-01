"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  severity: "info" | "warn" | "success" | "critical";
  reason:   string;
  size?:    "xs" | "sm";
}

const COLORS = {
  info:     "text-svi-info bg-svi-info/10 border-svi-info/30",
  warn:     "text-svi-warning bg-svi-warning/10 border-svi-warning/30",
  success:  "text-svi-success bg-svi-success/10 border-svi-success/30",
  critical: "text-svi-error bg-svi-error/10 border-svi-error/30",
} as const;

export function AiAnomalyBadge({ severity, reason, size = "xs" }: Props) {
  const [open, setOpen] = useState(false);
  const sizeClass = size === "xs" ? "size-3" : "size-3.5";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center rounded-full border ${COLORS[severity]} p-1`}
        title="Anomalía detectada"
        aria-label="Anomalía detectada — click para ver detalle"
      >
        <AlertTriangle className={sizeClass} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-30 w-64 rounded-lg border ${COLORS[severity]} bg-svi-card p-3 shadow-xl`}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 text-svi-muted-2 hover:text-svi-white"
            aria-label="Cerrar"
          >
            <X className="size-3" />
          </button>
          <p className="text-xs font-medium pr-4">Anomalía detectada</p>
          <p className="text-xs text-svi-muted mt-1 leading-relaxed">{reason}</p>
        </div>
      )}
    </span>
  );
}
