/**
 * Tokens de diseño SVI para PDFs.
 *
 * Colores pensados para impresión y pantalla:
 *  - Texto siempre legible (#0A0A0A sobre blanco)
 *  - Acento dorado (#C5A059) en separadores y datos secundarios
 *  - Acento rojo (#C8102E) en valores monetarios destacados y firmas
 */
export const SVI_COLORS = {
  black: "#0A0A0A",
  white: "#FFFFFF",
  textMuted: "#666666",
  textSubtle: "#888888",
  border: "#E0E0E0",
  gold: "#C5A059",
  goldSoft: "#F5F0E8",
  red: "#C8102E",
} as const;

export const SVI_FONTS = {
  /** Familia para títulos y datos destacados. Override vía registerSviFonts(). */
  display: "Helvetica-Bold",
  /** Familia para texto corrido. */
  body: "Helvetica",
  /** Familia para texto en italic (cláusulas legales). */
  bodyItalic: "Helvetica-Oblique",
} as const;

/** Tamaños tipográficos en pt — escala consistente con el plan SVI. */
export const SVI_SIZES = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 11,
  xl: 14,
  xxl: 16,
  hero: 18,
  display: 22,
} as const;
