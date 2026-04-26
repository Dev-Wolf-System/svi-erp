import { cn } from "@repo/utils";

export interface LogoProps {
  className?: string;
  variant?: "wordmark" | "monogram";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
};

/** Logo SVI tipográfico — wordmark default. */
export function Logo({ className, variant = "wordmark", size = "md" }: LogoProps) {
  if (variant === "monogram") {
    return (
      <div
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-md border border-svi-gold/40 bg-svi-card font-display font-bold text-svi-gold",
          className,
        )}
      >
        SVI
      </div>
    );
  }
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight text-svi-white",
        sizeMap[size],
        className,
      )}
    >
      <span className="text-svi-red">S</span>
      <span className="text-svi-white">V</span>
      <span className="text-svi-gold">I</span>
    </span>
  );
}
