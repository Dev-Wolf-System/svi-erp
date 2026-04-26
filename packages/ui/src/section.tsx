import { type HTMLAttributes } from "react";
import { cn } from "@repo/utils";

/** Wrapper estándar para secciones de landing — padding consistente + container max */
export function Section({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("relative w-full py-20 md:py-28 lg:py-32", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-7xl px-6 md:px-10">{children}</div>
    </section>
  );
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-block mb-4 text-xs font-mono tracking-[0.3em] uppercase text-svi-gold">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-svi-white leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base md:text-lg text-svi-muted-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
