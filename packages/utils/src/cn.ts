import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge condicional de clases Tailwind con resolución de conflictos.
 * Patrón estándar de shadcn/ui adaptado al monorepo.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
