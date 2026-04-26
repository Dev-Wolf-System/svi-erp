import { LOCALE_AR, TIMEZONE_AR } from "@repo/config/constants";

/**
 * Formatea fecha en TZ Argentina sin importar dónde corre el servidor.
 * Patrón obligatorio: guardamos UTC en DB, mostramos AR en UI.
 */
export function formatDate(
  input: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(LOCALE_AR, {
    timeZone: TIMEZONE_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(date);
}

/** "26/04/2026 14:32" */
export function formatDateTime(input: Date | string | null | undefined): string {
  return formatDate(input, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "26 de abril de 2026" */
export function formatDateLong(input: Date | string | null | undefined): string {
  return formatDate(input, { day: "numeric", month: "long", year: "numeric" });
}

/** "hace 3 horas", "en 2 días" */
export function formatRelative(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_AR, { numeric: "auto" });

  const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secInUnit] of ranges) {
    if (Math.abs(diffSec) >= secInUnit || unit === "second") {
      return rtf.format(Math.round(diffSec / secInUnit), unit);
    }
  }
  return "ahora";
}
