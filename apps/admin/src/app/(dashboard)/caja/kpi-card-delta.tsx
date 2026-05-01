"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { AiAnomalyBadge } from "@/components/ai/ai-anomaly-badge";

interface Props {
  label:        string;
  value:        string;
  deltaPct?:    number;
  deltaLabel?:  string;
  /** Para egresos: aumento es negativo (rojo), descenso positivo (verde). Default false. */
  invertColor?: boolean;
  sparkline?:   number[];
  icon:         React.ReactNode;
  accent:       "success" | "error" | "gold" | "info";
  anomalia?:    { severity: "warn" | "critical"; reason: string };
}

const ACCENT_BORDER = {
  success: "border-svi-success/20",
  error:   "border-svi-error/20",
  gold:    "border-svi-gold/20",
  info:    "border-svi-info/20",
} as const;

const SPARK_COLOR = {
  success: "#22C55E",
  error:   "#EF4444",
  gold:    "#C5A059",
  info:    "#3B82F6",
} as const;

export function KpiCardDelta({
  label,
  value,
  deltaPct,
  deltaLabel,
  invertColor = false,
  sparkline,
  icon,
  accent,
  anomalia,
}: Props) {
  const ring = ACCENT_BORDER[accent];
  const sparkColor = SPARK_COLOR[accent];

  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }));

  let deltaColor = "text-svi-muted-2";
  let DeltaIcon: React.ComponentType<{ className?: string }> = Minus;
  let deltaText = "";

  if (typeof deltaPct === "number") {
    const abs = Math.abs(deltaPct);
    deltaText = `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;

    if (abs < 2) {
      deltaColor = "text-svi-muted-2";
      DeltaIcon = Minus;
    } else {
      const positivo = deltaPct > 0;
      // Métrica "positiva" (ingresos/saldo): subir = verde. Métrica "invertida" (egresos): subir = rojo
      const esBueno = invertColor ? !positivo : positivo;
      deltaColor = esBueno ? "text-svi-success" : "text-svi-error";
      DeltaIcon = positivo ? ArrowUpRight : ArrowDownRight;
    }
  }

  return (
    <div className={`bg-svi-card border ${ring} rounded-2xl p-4 space-y-2 relative`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-svi-muted">{label}</p>
        <div className="flex items-center gap-1.5">
          {anomalia && (
            <AiAnomalyBadge severity={anomalia.severity} reason={anomalia.reason} />
          )}
          {icon}
        </div>
      </div>

      <p className="text-xl font-bold text-svi-white font-mono tabular-nums leading-tight">
        {value}
      </p>

      {(typeof deltaPct === "number" || (sparkline && sparkline.length > 1)) && (
        <div className="flex items-center justify-between gap-2 pt-1">
          {typeof deltaPct === "number" ? (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${deltaColor}`}>
              <DeltaIcon className="size-3" />
              <span className="tabular-nums">{deltaText}</span>
              {deltaLabel && (
                <span className="text-svi-muted-2 font-normal ml-1">{deltaLabel}</span>
              )}
            </span>
          ) : (
            <span />
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="w-[60px] h-[20px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={sparkColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
