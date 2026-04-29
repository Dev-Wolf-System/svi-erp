/**
 * Tipos del motor de cálculo FCI.
 *
 * Documentado en español para que el equipo legal pueda revisar la
 * semántica sin necesidad de leer TypeScript a fondo.
 */

export type Moneda = "ARS" | "USD";

export type ModoCapitalizacion = "simple" | "compuesta";

/** Período mensual identificado por el primer día del mes (YYYY-MM-01). */
export type PeriodoYYYYMM = `${string}-${string}`;

export interface InversionParaCalculo {
  /** Capital sobre el que se aplica la tasa este período (congelado al inicio del período). */
  capital_base: number;
  /** Tasa mensual en porcentaje (ej: 3.5 → 3.5% mensual). */
  tasa_mensual_pct: number;
  moneda: Moneda;
  /**
   * Modo de capitalización del FCI.
   * - `simple`: el interés del mes NO se suma al capital. El inversor lo retira.
   * - `compuesta`: el interés del mes se suma al capital y el siguiente período
   *   aplica tasa sobre `capital + interes_acumulado`.
   *
   * Default 'simple' — el modelo actual de SVI. Se puede cambiar por inversión
   * vía `inversiones.config.modo_capitalizacion` cuando el dictamen legal lo
   * requiera (ADR 0007 flex-first).
   */
  modo: ModoCapitalizacion;
}

export interface Liquidacion {
  periodo: PeriodoYYYYMM;
  capital_base: number;
  tasa_aplicada_pct: number;
  monto_interes: number;
  moneda: Moneda;
}

export interface ProyeccionInput extends InversionParaCalculo {
  /** Mes y año de inicio (YYYY-MM-01). Primer período proyectado es ESTE mes. */
  fecha_inicio: PeriodoYYYYMM;
  /** Cuántos períodos proyectar — debe ser >= 1. */
  meses: number;
}
