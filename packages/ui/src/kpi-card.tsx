import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@repo/utils";

export interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  hint?: string;
  palette?: "default" | "success" | "warning" | "danger" | "gold";
  className?: string;
}

const paletteMap = {
  default: { iconBg: "bg-svi-elevated", iconColor: "text-svi-gold" },
  success: { iconBg: "bg-svi-success/10", iconColor: "text-svi-success" },
  warning: { iconBg: "bg-svi-warning/10", iconColor: "text-svi-warning" },
  danger: { iconBg: "bg-svi-error/10", iconColor: "text-svi-error" },
  gold: { iconBg: "bg-svi-gold/10", iconColor: "text-svi-gold" },
} as const;

export function KpiCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  hint,
  palette = "default",
  className,
}: KpiCardProps) {
  const { iconBg, iconColor } = paletteMap[palette];
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up"
      ? "text-svi-success"
      : trend === "down"
        ? "text-svi-error"
        : "text-svi-muted-2";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-svi-border-muted bg-svi-card p-5 transition-all hover:border-svi-gold/30 hover:shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-svi-muted-2">
            {title}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-svi-white tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        )}
      </div>
      {(change !== undefined || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {change !== undefined && trend && (
            <span className={cn("flex items-center gap-0.5 font-medium", trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          )}
          {hint && <span className="text-svi-muted-2">{hint}</span>}
        </div>
      )}
    </div>
  );
}
