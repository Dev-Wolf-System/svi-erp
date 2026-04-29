import {
  calcularInteresMensual,
  redondearMoneda,
} from "./intereses";
import type {
  Liquidacion,
  PeriodoYYYYMM,
  ProyeccionInput,
} from "./types";

/**
 * Genera una liquidación para un período concreto sin persistencia.
 *
 * El `capital_base` y la `tasa_aplicada_pct` que recibe quedan
 * congelados en el resultado — son la fuente de verdad de ese período.
 * No leer la DB después; lo que importa para auditoría es lo que
 * persistimos junto con el cálculo.
 */
export function calcularLiquidacionPeriodo(input: {
  periodo: PeriodoYYYYMM;
  capital_base: number;
  tasa_aplicada_pct: number;
  moneda: Liquidacion["moneda"];
}): Liquidacion {
  const monto_interes = calcularInteresMensual(
    input.capital_base,
    input.tasa_aplicada_pct,
  );
  return {
    periodo: input.periodo,
    capital_base: redondearMoneda(input.capital_base),
    tasa_aplicada_pct: input.tasa_aplicada_pct,
    monto_interes,
    moneda: input.moneda,
  };
}

/**
 * Proyecta `meses` liquidaciones consecutivas a partir de `fecha_inicio`.
 *
 * - En modo `simple`, todos los meses tienen el MISMO `capital_base`
 *   (no se reinvierte). Cada mes genera el mismo interés.
 *
 * - En modo `compuesta`, el `capital_base` del mes N+1 es el `capital_base`
 *   del mes N + el `monto_interes` redondeado del mes N (con el redondeo
 *   intermedio aplicado — es la realidad operativa).
 *
 * El array resultante tiene exactamente `meses` items, ordenado por
 * período ascendente.
 */
export function proyectarLiquidaciones(input: ProyeccionInput): Liquidacion[] {
  if (input.meses < 1 || !Number.isInteger(input.meses)) {
    throw new Error("proyectarLiquidaciones: meses debe ser entero >= 1");
  }

  const result: Liquidacion[] = [];
  let capital = input.capital_base;
  let periodo = primerDiaDelMes(input.fecha_inicio);

  for (let i = 0; i < input.meses; i++) {
    const liq = calcularLiquidacionPeriodo({
      periodo,
      capital_base: capital,
      tasa_aplicada_pct: input.tasa_mensual_pct,
      moneda: input.moneda,
    });
    result.push(liq);

    if (input.modo === "compuesta") {
      capital = redondearMoneda(capital + liq.monto_interes);
    }
    periodo = sumarMesAPeriodo(periodo);
  }

  return result;
}

/**
 * Suma de intereses acumulados de un array de liquidaciones.
 * Útil para reportes de inversor ("total cobrado al período X").
 */
export function totalInteresesAcumulado(liqs: Liquidacion[]): number {
  return redondearMoneda(
    liqs.reduce((acc, l) => acc + l.monto_interes, 0),
  );
}

// ============================================================================
// Helpers de período
// ============================================================================

/**
 * Normaliza una fecha YYYY-MM-DD al primer día del mes (YYYY-MM-01).
 * Acepta también `YYYY-MM` (sin día).
 */
export function primerDiaDelMes(fechaIso: string): PeriodoYYYYMM {
  const match = /^(\d{4})-(\d{2})/.exec(fechaIso);
  if (!match) {
    throw new Error(`primerDiaDelMes: fecha inválida "${fechaIso}"`);
  }
  return `${match[1]}-${match[2]}-01` as PeriodoYYYYMM;
}

/**
 * Devuelve el período del mes siguiente (YYYY-MM-01).
 *
 * No usa Date para evitar el bug clásico de "el 31 de enero +1 mes = 3 de
 * marzo" que da Date.setMonth() — trabajamos en aritmética entera.
 */
export function sumarMesAPeriodo(periodo: PeriodoYYYYMM): PeriodoYYYYMM {
  const match = /^(\d{4})-(\d{2})-01$/.exec(periodo);
  if (!match) {
    throw new Error(`sumarMesAPeriodo: período no canónico "${periodo}"`);
  }
  let anio = Number(match[1]);
  let mes = Number(match[2]);
  mes += 1;
  if (mes > 12) {
    mes = 1;
    anio += 1;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-01` as PeriodoYYYYMM;
}

/**
 * Cantidad de meses calendario completos entre dos fechas YYYY-MM-DD.
 * - Si `hasta` es ANTES de `desde`, devuelve 0 (no negativos — eso es bug).
 * - Si caen en el mismo mes calendario, devuelve 0.
 * - Si la diferencia es de un día calendario que cruza fin de mes,
 *   devuelve 1 (criterio "mes calendario completado").
 *
 * Usar para la UI ("meses transcurridos") — para liquidar mes a mes
 * usar el cron + el período concreto.
 */
export function mesesEntreFechas(desdeIso: string, hastaIso: string): number {
  const a = parseFechaIso(desdeIso);
  const b = parseFechaIso(hastaIso);
  if (b.anio < a.anio || (b.anio === a.anio && b.mes < a.mes)) return 0;
  let meses = (b.anio - a.anio) * 12 + (b.mes - a.mes);
  if (b.dia < a.dia) meses -= 1;
  return Math.max(0, meses);
}

function parseFechaIso(s: string): { anio: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) throw new Error(`fecha ISO inválida "${s}"`);
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}
