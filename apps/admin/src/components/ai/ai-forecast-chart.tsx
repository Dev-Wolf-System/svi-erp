"use client";

import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { ForecastPoint } from "@/modules/ai/schemas";

interface HistoricalPoint {
  date:  string;
  value: number;
}

interface Props {
  historical: HistoricalPoint[];
  forecast:   ForecastPoint[];
  title?:     string;
  height?:    number;
}

interface CombinedPoint {
  date:     string;
  actual?:  number;
  forecast?: number;
  range?:   [number, number];
}

function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

interface TooltipPayloadItem {
  name:  string;
  value: number | string;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-svi-border-muted bg-svi-card p-3 shadow-xl">
      <p className="text-xs text-svi-muted">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{typeof p.value === "number" ? formatARS(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function AiForecastChart({ historical, forecast, title, height = 240 }: Props) {
  const combined: CombinedPoint[] = [
    ...historical.map((h) => ({ date: h.date, actual: h.value })),
    ...forecast.map((f) => ({
      date:     f.date,
      forecast: f.value,
      range:    [f.lower, f.upper] as [number, number],
    })),
  ];

  return (
    <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
      {title && <h3 className="text-sm font-semibold text-svi-white mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={combined} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#1A2236" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#6B7A9E" tick={{ fontSize: 10 }} />
          <YAxis stroke="#6B7A9E" tick={{ fontSize: 10 }} tickFormatter={(v) => formatARS(Number(v))} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill="#C5A059"
            fillOpacity={0.1}
            name="IC 95%"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#C5A059"
            strokeWidth={2}
            dot={false}
            name="Real"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#C5A059"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Proyección"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
