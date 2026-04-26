"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@repo/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-svi-gold focus-visible:ring-offset-2 focus-visible:ring-offset-svi-black disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-svi-red text-svi-white hover:bg-svi-red-hover hover:shadow-[0_0_24px_rgba(200,16,46,0.45)] active:scale-[0.98]",
        secondary:
          "border border-svi-gold/60 bg-transparent text-svi-gold hover:bg-svi-gold/10 hover:border-svi-gold active:scale-[0.98]",
        ghost:
          "bg-transparent text-svi-muted hover:bg-svi-elevated hover:text-svi-white",
        glass:
          "bg-svi-card/70 backdrop-blur-md border border-svi-gold/15 text-svi-white hover:bg-svi-card hover:border-svi-gold/40",
        destructive:
          "bg-svi-error/10 border border-svi-error/40 text-svi-error hover:bg-svi-error/20",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-md",
        md: "h-11 px-5 text-sm rounded-lg",
        lg: "h-14 px-8 text-base rounded-lg",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
