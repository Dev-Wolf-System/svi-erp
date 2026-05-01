"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface Props {
  data:    Array<{ date: string; saldo: number }>;
  height?: number;
  title?:  string;
}

function formatARSAbrev(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
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

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0]?.value;
  return (
    <div className="rounded-lg border border-svi-border-muted bg-svi-card/90 backdrop-blur p-3 shadow-xl">
      <p className="text-xs text-svi-muted">{label}</p>
      <p className="text-sm font-mono font-semibold text-svi-gold">
        {typeof v === "number" ? formatARS(v) : String(v ?? "")}
      </p>
    </div>
  );
}

export function SaldoAreaChart({ data, height = 220, title }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
        {title && <h3 className="text-sm font-semibold text-svi-white mb-2">{title}</h3>}
        <p className="text-xs text-svi-muted-2 py-8 text-center">
          Sin datos suficientes para graficar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
      {title && <h3 className="text-sm font-semibold text-svi-white mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#C5A059" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#C5A059" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1F1F1F" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#A0A0A0"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)} // MM-DD
            minTickGap={20}
          />
          <YAxis
            stroke="#A0A0A0"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => formatARSAbrev(Number(v))}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="saldo"
            stroke="#C5A059"
            strokeWidth={2}
            fill="url(#saldoFill)"
            name="Saldo"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
