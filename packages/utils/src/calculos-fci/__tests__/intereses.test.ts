import { describe, it, expect } from "vitest";
import {
  redondearMoneda,
  calcularInteresMensual,
  calcularSaldoBrutoSimple,
  calcularSaldoBrutoCompuesto,
} from "../intereses";

describe("redondearMoneda — half-even (banker's rounding)", () => {
  it("redondea hacia abajo si la fracción es < 0.5", () => {
    expect(redondearMoneda(100.004)).toBe(100);
    expect(redondearMoneda(100.494)).toBeCloseTo(100.49, 5);
  });

  it("redondea hacia arriba si la fracción es > 0.5", () => {
    expect(redondearMoneda(100.006)).toBeCloseTo(100.01, 5);
    expect(redondearMoneda(100.499)).toBeCloseTo(100.5, 5);
  });

  it("empate exacto: redondea al par", () => {
    // 100.005 → centavos 10000.5 → empate → al par (10000) → 100.00
    expect(redondearMoneda(100.005)).toBeCloseTo(100, 5);
    // 100.015 → centavos 10001.5 → al par (10002) → 100.02
    expect(redondearMoneda(100.015)).toBeCloseTo(100.02, 5);
    // 100.025 → centavos 10002.5 → al par (10002) → 100.02
    expect(redondearMoneda(100.025)).toBeCloseTo(100.02, 5);
    // 100.035 → centavos 10003.5 → al par (10004) → 100.04
    expect(redondearMoneda(100.035)).toBeCloseTo(100.04, 5);
  });

  it("preserva valores ya con 2 decimales", () => {
    expect(redondearMoneda(100.5)).toBe(100.5);
    expect(redondearMoneda(0)).toBe(0);
    expect(redondearMoneda(99.99)).toBe(99.99);
  });

  it("rechaza valores no finitos", () => {
    expect(() => redondearMoneda(NaN)).toThrow();
    expect(() => redondearMoneda(Infinity)).toThrow();
    expect(() => redondearMoneda(-Infinity)).toThrow();
  });

  it("acepta negativos (descuentos, ajustes)", () => {
    expect(redondearMoneda(-100.005)).toBeCloseTo(-100, 5);
  });
});

describe("calcularInteresMensual", () => {
  it("3.5% sobre 1.000.000 = 35.000", () => {
    expect(calcularInteresMensual(1_000_000, 3.5)).toBe(35_000);
  });

  it("0% sobre cualquier capital = 0", () => {
    expect(calcularInteresMensual(500_000, 0)).toBe(0);
    expect(calcularInteresMensual(0, 0)).toBe(0);
  });

  it("capital 0 con cualquier tasa = 0", () => {
    expect(calcularInteresMensual(0, 5)).toBe(0);
    expect(calcularInteresMensual(0, 99.99)).toBe(0);
  });

  it("redondea half-even — capital con decimales no propaga error binario", () => {
    // 0.1 + 0.2 ≠ 0.3 en float — el redondeo final lo arregla
    expect(calcularInteresMensual(123_456.78, 4.25)).toBe(
      Number((123_456.78 * 0.0425).toFixed(2)),
    );
  });

  it("rechaza capital negativo", () => {
    expect(() => calcularInteresMensual(-1, 3)).toThrow();
  });

  it("rechaza tasa negativa", () => {
    expect(() => calcularInteresMensual(100_000, -0.1)).toThrow();
  });

  it("rechaza tasa fuera de rango (>= 100)", () => {
    expect(() => calcularInteresMensual(100_000, 100)).toThrow();
    expect(() => calcularInteresMensual(100_000, 200)).toThrow();
  });

  it("acepta tasa en el límite 99.99%", () => {
    expect(() => calcularInteresMensual(100, 99.99)).not.toThrow();
  });

  it("rechaza inputs no finitos", () => {
    expect(() => calcularInteresMensual(NaN, 3)).toThrow();
    expect(() => calcularInteresMensual(100, NaN)).toThrow();
  });
});

describe("calcularSaldoBrutoSimple", () => {
  it("0 meses = capital intacto (sin interés)", () => {
    expect(calcularSaldoBrutoSimple(1_000_000, 5, 0)).toBe(1_000_000);
  });

  it("12 meses al 3% sobre 1.000.000 = 1.000.000 + 12*30.000 = 1.360.000", () => {
    expect(calcularSaldoBrutoSimple(1_000_000, 3, 12)).toBe(1_360_000);
  });

  it("simple NO capitaliza — interés acumulado lineal", () => {
    const cap = 100_000;
    const tasa = 5;
    const interes1mes = calcularSaldoBrutoSimple(cap, tasa, 1) - cap;
    const interes12meses = calcularSaldoBrutoSimple(cap, tasa, 12) - cap;
    expect(interes12meses).toBe(interes1mes * 12);
  });

  it("rechaza meses no entero", () => {
    expect(() => calcularSaldoBrutoSimple(1000, 3, 1.5)).toThrow();
  });

  it("rechaza meses negativo", () => {
    expect(() => calcularSaldoBrutoSimple(1000, 3, -1)).toThrow();
  });
});

describe("calcularSaldoBrutoCompuesto", () => {
  it("0 meses = capital intacto", () => {
    expect(calcularSaldoBrutoCompuesto(1_000_000, 5, 0)).toBe(1_000_000);
  });

  it("1 mes coincide con el simple", () => {
    expect(calcularSaldoBrutoCompuesto(500_000, 4, 1)).toBe(
      calcularSaldoBrutoSimple(500_000, 4, 1),
    );
  });

  it("compuesto > simple para meses > 1 con tasa > 0", () => {
    const compuesto = calcularSaldoBrutoCompuesto(1_000_000, 5, 6);
    const simple = calcularSaldoBrutoSimple(1_000_000, 5, 6);
    expect(compuesto).toBeGreaterThan(simple);
  });

  it("12 meses al 3% compuesto sobre 1.000.000 ≈ 1.425.760.89", () => {
    // 1_000_000 × 1.03^12 = 1_425_760.886846...
    const result = calcularSaldoBrutoCompuesto(1_000_000, 3, 12);
    expect(result).toBeCloseTo(1_425_760.89, 2);
  });

  it("tasa 0% mantiene capital cualquier período", () => {
    expect(calcularSaldoBrutoCompuesto(789_000, 0, 240)).toBe(789_000);
  });

  it("rechaza meses no entero", () => {
    expect(() => calcularSaldoBrutoCompuesto(1000, 3, 0.5)).toThrow();
  });

  it("rechaza meses negativo", () => {
    expect(() => calcularSaldoBrutoCompuesto(1000, 3, -2)).toThrow();
  });

  it("rechaza tasa fuera de rango", () => {
    expect(() => calcularSaldoBrutoCompuesto(1000, 100, 1)).toThrow();
    expect(() => calcularSaldoBrutoCompuesto(1000, -1, 1)).toThrow();
  });

  it("rechaza capital inválido", () => {
    expect(() => calcularSaldoBrutoCompuesto(-1, 3, 1)).toThrow();
    expect(() => calcularSaldoBrutoCompuesto(NaN, 3, 1)).toThrow();
  });
});
