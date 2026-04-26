import { LOCALE_AR, type Currency } from "@repo/config/constants";

/**
 * Formatea un monto en la moneda indicada con locale es-AR.
 * Ej: formatCurrency(1500000, 'ARS') → "$ 1.500.000,00"
 *     formatCurrency(25000.5, 'USD') → "US$ 25.000,50"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: Currency = "ARS",
  options?: Intl.NumberFormatOptions,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(LOCALE_AR, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Versión compacta para KPI cards: "$ 1,5M", "$ 250K" */
export function formatCurrencyCompact(
  amount: number | string | null | undefined,
  currency: Currency = "ARS",
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(LOCALE_AR, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/** Solo el número sin el símbolo: "1.500.000,00" */
export function formatNumber(
  value: number | string | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(LOCALE_AR, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Porcentaje: 12.5 → "12,50%" */
export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(LOCALE_AR, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}
