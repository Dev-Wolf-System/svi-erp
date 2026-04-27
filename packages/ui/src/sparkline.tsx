import { cn } from "@repo/utils";

export interface SparklineProps {
  data: number[];
  color?: string;
  fill?: string;
  height?: number;
  className?: string;
}

/**
 * Sparkline minimalista en SVG puro — sin dependencias externas.
 * Usa el color CSS pasado y un fill semitransparente debajo.
 */
export function Sparkline({
  data,
  color = "var(--color-svi-gold)",
  fill,
  height = 40,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const w = 100;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fillPath = `M0,${h} L${points
    .split(" ")
    .map((p) => p.replace(",", " "))
    .join(" L")} L${w},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("block w-full", className)}
      style={{ height }}
      aria-hidden
    >
      {fill && <path d={fillPath} fill={fill} />}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
