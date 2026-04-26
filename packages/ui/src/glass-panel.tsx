import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@repo/utils";

/**
 * Panel con efecto glassmorphism premium SVI.
 * Patrón principal para paneles del admin y tarjetas destacadas en landing.
 */
export const GlassPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border border-svi-gold/15 bg-svi-card/70 backdrop-blur-xl",
        "shadow-[0_8px_40px_rgba(0,0,0,0.5)]",
        "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none",
        "before:bg-gradient-to-br before:from-svi-gold/5 before:to-transparent",
        className,
      )}
      {...props}
    />
  ),
);
GlassPanel.displayName = "GlassPanel";
