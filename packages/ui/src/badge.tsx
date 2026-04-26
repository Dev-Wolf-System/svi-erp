import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@repo/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
  {
    variants: {
      variant: {
        default: "bg-svi-elevated border-svi-border-muted text-svi-muted",
        success: "bg-svi-success/10 border-svi-success/30 text-svi-success",
        warning: "bg-svi-warning/10 border-svi-warning/30 text-svi-warning",
        danger: "bg-svi-error/10 border-svi-error/30 text-svi-error",
        info: "bg-svi-info/10 border-svi-info/30 text-svi-info",
        gold: "bg-svi-gold/10 border-svi-gold/30 text-svi-gold",
        red: "bg-svi-red/10 border-svi-red/30 text-svi-red",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * Badge específico de estado de vehículo — color semánticamente correcto según §7.1 del plan.
 */
export function EstadoVehiculoBadge({ estado }: { estado: string }) {
  const map: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    stock: { variant: "success", label: "En stock" },
    reservado: { variant: "gold", label: "Reservado" },
    vendido: { variant: "danger", label: "Vendido" },
    consignacion: { variant: "info", label: "Consignación" },
    preparacion: { variant: "info", label: "En preparación" },
    baja: { variant: "default", label: "Baja" },
  };
  const { variant, label } = map[estado] ?? { variant: "default", label: estado };
  return <Badge variant={variant}>{label}</Badge>;
}
