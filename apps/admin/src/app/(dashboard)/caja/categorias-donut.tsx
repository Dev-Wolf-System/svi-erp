"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DataPoint {
  categoria:  string;
  total:      number;
  porcentaje: number;
  color:      string;
}

interface Props {
  data:          DataPoint[];
  title?:        string;
  emptyMessage?: string;
}

function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

const TOP_LIMIT = 6;
const OTROS_COLOR = "#6B7280";

interface TooltipPayloadItem {
  name:    string;
  value:   number;
  payload: DataPoint;
}

function CustomTooltip({
  active, payload,
}: {
  active?:  boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-svi-border-muted bg-svi-card/90 backdrop-blur p-3 shadow-xl">
      <p className="text-xs text-svi-muted">{p.categoria}</p>
      <p className="text-sm font-mono font-semibold text-svi-white">{formatARS(p.total)}</p>
      <p className="text-xs text-svi-muted-2">{p.porcentaje.toFixed(1)}%</p>
    </div>
  );
}

export function CategoriasDonut({ data, title, emptyMessage }: Props) {
  // Top N + agrupar resto en "Otros"
  let display: DataPoint[] = data;
  if (data.length > TOP_LIMIT) {
    const top   = data.slice(0, TOP_LIMIT - 1);
    const resto = data.slice(TOP_LIMIT - 1);
    const totalResto = resto.reduce((s, r) => s + r.total, 0);
    const pctResto   = resto.reduce((s, r) => s + r.porcentaje, 0);
    display = [
      ...top,
      {
        categoria:  "Otros",
        total:      Number(totalResto.toFixed(2)),
        porcentaje: Number(pctResto.toFixed(2)),
        color:      OTROS_COLOR,
      },
    ];
  }

  if (display.length === 0) {
    return (
      <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
        {title && <h3 className="text-sm font-semibold text-svi-white mb-2">{title}</h3>}
        <p className="text-xs text-svi-muted-2 py-8 text-center">
          {emptyMessage ?? "Sin datos en el período."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
      {title && <h3 className="text-sm font-semibold text-svi-white mb-3">{title}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={display}
                dataKey="total"
                nameKey="categoria"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={1}
                stroke="none"
              >
                {display.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-1.5 text-xs">
          {display.map((d, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: d.color }}
                aria-hidden
              />
              <span className="text-svi-muted truncate flex-1">{d.categoria}</span>
              <span className="text-svi-white font-mono tabular-nums">
                {d.porcentaje.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
