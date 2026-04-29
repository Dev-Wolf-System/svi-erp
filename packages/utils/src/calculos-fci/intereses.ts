/**
 * Cálculo de intereses FCI — núcleo determinístico y puro.
 *
 * REGLAS DE ORO (no romper sin actualizar tests Y avisar al equipo):
 *
 *   1. Toda función es PURA: mismo input → mismo output, sin side effects,
 *      sin lectura de fechas/random/env. Los inputs externos (fecha actual)
 *      se inyectan como parámetro.
 *
 *   2. La precisión es 2 decimales con redondeo half-even (bancario):
 *      `redondearMoneda(0.005)  → 0.00` (no 0.01, evita sesgo)
 *      `redondearMoneda(0.015)  → 0.02`
 *      Esto importa para ARS/USD; cripto requeriría otra escala.
 *
 *   3. Tasa se expresa SIEMPRE como porcentaje (3.5 = 3.5%). Internamente
 *      se divide por 100. NO usar fracciones (0.035) en interfaces públicas.
 *
 *   4. Capital y monto_interes son `number`. La DB los guarda como
 *      DECIMAL(15,2) — el conversor en queries.ts hace `Number(decimal)`.
 *      No usamos BigInt porque el rango (15,2) cabe holgadamente en
 *      Number.MAX_SAFE_INTEGER / 100. Para FCI USD esto sigue siendo
 *      seguro hasta ~$90 trillones.
 */

/**
 * Redondea un monto a la moneda con 2 decimales usando half-even (banker's
 * rounding). Half-even evita sesgo acumulado al redondear muchos cálculos.
 *
 * Ejemplos:
 *   redondearMoneda(100.005)  → 100.00
 *   redondearMoneda(100.015)  → 100.02
 *   redondearMoneda(100.025)  → 100.02
 *   redondearMoneda(100.035)  → 100.04
 */
export function redondearMoneda(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("redondearMoneda: monto no finito");
  }
  // Trabajamos en centavos para evitar errores binarios.
  // Multiplicamos por 100, redondeamos half-even, dividimos por 100.
  const centavos = amount * 100;
  const floor = Math.floor(centavos);
  const diff = centavos - floor;

  let redondeado: number;
  if (diff < 0.5) {
    redondeado = floor;
  } else if (diff > 0.5) {
    redondeado = floor + 1;
  } else {
    // Empate exacto: redondear al par más cercano.
    redondeado = floor % 2 === 0 ? floor : floor + 1;
  }
  return redondeado / 100;
}

/**
 * Interés mensual sobre un capital base con tasa porcentual mensual.
 *
 * Fórmula: interés = capital × (tasa / 100)
 *
 * Devuelve el monto redondeado a 2 decimales.
 *
 * Restricciones:
 *   - capital >= 0 (capital negativo no tiene sentido económico)
 *   - tasa >= 0 (tasa negativa equivale a multa/quita; usar otro flujo)
 *   - tasa <= 99.99 (tope técnico — coincide con CHECK del schema)
 */
export function calcularInteresMensual(
  capital: number,
  tasaMensualPct: number,
): number {
  if (!Number.isFinite(capital) || capital < 0) {
    throw new Error("calcularInteresMensual: capital inválido");
  }
  if (!Number.isFinite(tasaMensualPct) || tasaMensualPct < 0 || tasaMensualPct > 99.99) {
    throw new Error(
      "calcularInteresMensual: tasa fuera de rango (0..99.99)",
    );
  }
  return redondearMoneda(capital * (tasaMensualPct / 100));
}

/**
 * Calcula el saldo bruto (capital + intereses acumulados) tras N meses
 * en modo simple — los intereses NO se reinvierten, sólo se suman para
 * mostrar al inversor cuánto debería haber cobrado en total.
 *
 * Útil para proyecciones rápidas en la UI cuando aún no hay liquidaciones
 * persistidas. NO sirve para liquidar realmente — para eso usar
 * `proyectarLiquidaciones` que devuelve cada período individualmente.
 */
export function calcularSaldoBrutoSimple(
  capital: number,
  tasaMensualPct: number,
  meses: number,
): number {
  if (!Number.isFinite(meses) || meses < 0 || !Number.isInteger(meses)) {
    throw new Error("calcularSaldoBrutoSimple: meses debe ser entero >= 0");
  }
  const interesUnMes = calcularInteresMensual(capital, tasaMensualPct);
  // En simple, todos los meses generan el mismo interés sobre el capital fijo.
  return redondearMoneda(capital + interesUnMes * meses);
}

/**
 * Saldo bruto en modo compuesto: cada mes el interés se reinvierte.
 *
 * Fórmula: saldo = capital × (1 + tasa/100) ^ meses
 *
 * Aplica un único redondeo final — los redondeos intermedios introducen
 * sesgo. Para el monto a pagar mes a mes con composición real (que SÍ
 * tiene redondeos intermedios) usar `proyectarLiquidaciones({ modo: 'compuesta' })`.
 */
export function calcularSaldoBrutoCompuesto(
  capital: number,
  tasaMensualPct: number,
  meses: number,
): number {
  if (!Number.isFinite(meses) || meses < 0 || !Number.isInteger(meses)) {
    throw new Error("calcularSaldoBrutoCompuesto: meses debe ser entero >= 0");
  }
  if (!Number.isFinite(capital) || capital < 0) {
    throw new Error("calcularSaldoBrutoCompuesto: capital inválido");
  }
  if (!Number.isFinite(tasaMensualPct) || tasaMensualPct < 0 || tasaMensualPct > 99.99) {
    throw new Error("calcularSaldoBrutoCompuesto: tasa fuera de rango");
  }
  const factor = (1 + tasaMensualPct / 100) ** meses;
  return redondearMoneda(capital * factor);
}
