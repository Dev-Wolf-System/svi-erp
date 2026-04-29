import { describe, it, expect } from "vitest";
import {
  calcularLiquidacionPeriodo,
  proyectarLiquidaciones,
  totalInteresesAcumulado,
  primerDiaDelMes,
  sumarMesAPeriodo,
  mesesEntreFechas,
} from "../liquidaciones";
import type { Liquidacion } from "../types";

describe("primerDiaDelMes", () => {
  it("normaliza YYYY-MM-DD a YYYY-MM-01", () => {
    expect(primerDiaDelMes("2026-04-29")).toBe("2026-04-01");
    expect(primerDiaDelMes("2026-12-31")).toBe("2026-12-01");
  });

  it("acepta YYYY-MM (sin día)", () => {
    expect(primerDiaDelMes("2026-04")).toBe("2026-04-01");
  });

  it("acepta ISO con hora", () => {
    expect(primerDiaDelMes("2026-04-29T15:30:00Z")).toBe("2026-04-01");
  });

  it("rechaza formato inválido", () => {
    expect(() => primerDiaDelMes("29/04/2026")).toThrow();
    expect(() => primerDiaDelMes("abril")).toThrow();
  });
});

describe("sumarMesAPeriodo", () => {
  it("avanza un mes simple", () => {
    expect(sumarMesAPeriodo("2026-04-01")).toBe("2026-05-01");
  });

  it("cruza año diciembre → enero del siguiente", () => {
    expect(sumarMesAPeriodo("2026-12-01")).toBe("2027-01-01");
  });

  it("rechaza período no canónico", () => {
    expect(() => sumarMesAPeriodo("2026-04-15")).toThrow();
    expect(() => sumarMesAPeriodo("2026-13-01")).not.toThrow();
    // ↑ no validamos rango del mes — confiamos en input canónico
  });
});

describe("mesesEntreFechas", () => {
  it("mismo mes calendario = 0", () => {
    expect(mesesEntreFechas("2026-04-01", "2026-04-29")).toBe(0);
  });

  it("mes calendario completo = 1", () => {
    expect(mesesEntreFechas("2026-04-01", "2026-05-01")).toBe(1);
  });

  it("11 meses + un día casi = 12", () => {
    expect(mesesEntreFechas("2026-01-15", "2026-12-15")).toBe(11);
    expect(mesesEntreFechas("2026-01-15", "2026-12-16")).toBe(11);
    expect(mesesEntreFechas("2026-01-15", "2027-01-15")).toBe(12);
  });

  it("hasta < desde devuelve 0 (no negativo)", () => {
    expect(mesesEntreFechas("2026-12-01", "2026-01-01")).toBe(0);
  });

  it("día menor en hasta resta un mes", () => {
    expect(mesesEntreFechas("2026-04-15", "2026-05-14")).toBe(0);
    expect(mesesEntreFechas("2026-04-15", "2026-05-15")).toBe(1);
  });
});

describe("calcularLiquidacionPeriodo", () => {
  it("congela capital_base, tasa y monto en el resultado", () => {
    const liq = calcularLiquidacionPeriodo({
      periodo: "2026-04-01",
      capital_base: 1_000_000,
      tasa_aplicada_pct: 3.5,
      moneda: "ARS",
    });
    expect(liq).toEqual({
      periodo: "2026-04-01",
      capital_base: 1_000_000,
      tasa_aplicada_pct: 3.5,
      monto_interes: 35_000,
      moneda: "ARS",
    });
  });

  it("preserva moneda USD", () => {
    const liq = calcularLiquidacionPeriodo({
      periodo: "2026-04-01",
      capital_base: 10_000,
      tasa_aplicada_pct: 1,
      moneda: "USD",
    });
    expect(liq.moneda).toBe("USD");
    expect(liq.monto_interes).toBe(100);
  });
});

describe("proyectarLiquidaciones — modo simple", () => {
  it("genera N períodos con mismo capital y mismo interés", () => {
    const projs = proyectarLiquidaciones({
      capital_base: 1_000_000,
      tasa_mensual_pct: 3,
      moneda: "ARS",
      modo: "simple",
      fecha_inicio: "2026-04-01",
      meses: 6,
    });
    expect(projs).toHaveLength(6);
    expect(projs.every((l) => l.capital_base === 1_000_000)).toBe(true);
    expect(projs.every((l) => l.monto_interes === 30_000)).toBe(true);
  });

  it("avanza períodos correctamente cruzando año", () => {
    const projs = proyectarLiquidaciones({
      capital_base: 100_000,
      tasa_mensual_pct: 2,
      moneda: "ARS",
      modo: "simple",
      fecha_inicio: "2026-11-01",
      meses: 4,
    });
    expect(projs.map((l) => l.periodo)).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
  });
});

describe("proyectarLiquidaciones — modo compuesta", () => {
  it("capital_base crece mes a mes con el interés del previo", () => {
    const projs = proyectarLiquidaciones({
      capital_base: 100_000,
      tasa_mensual_pct: 5,
      moneda: "ARS",
      modo: "compuesta",
      fecha_inicio: "2026-04-01",
      meses: 3,
    });

    // Mes 1: capital 100.000, interés 5.000 → siguiente capital 105.000
    expect(projs[0]?.capital_base).toBe(100_000);
    expect(projs[0]?.monto_interes).toBe(5_000);

    // Mes 2: capital 105.000, interés 5.250 → siguiente capital 110.250
    expect(projs[1]?.capital_base).toBe(105_000);
    expect(projs[1]?.monto_interes).toBe(5_250);

    // Mes 3: capital 110.250, interés 5.512.50
    expect(projs[2]?.capital_base).toBe(110_250);
    expect(projs[2]?.monto_interes).toBe(5_512.5);
  });

  it("compuesta vs simple — la diferencia crece con N meses", () => {
    const baseInput = {
      capital_base: 1_000_000,
      tasa_mensual_pct: 4,
      moneda: "ARS" as const,
      fecha_inicio: "2026-01-01" as const,
      meses: 12,
    };
    const simple = totalInteresesAcumulado(
      proyectarLiquidaciones({ ...baseInput, modo: "simple" }),
    );
    const compuesta = totalInteresesAcumulado(
      proyectarLiquidaciones({ ...baseInput, modo: "compuesta" }),
    );
    expect(compuesta).toBeGreaterThan(simple);
  });
});

describe("proyectarLiquidaciones — validación", () => {
  it("rechaza meses < 1", () => {
    expect(() =>
      proyectarLiquidaciones({
        capital_base: 1000,
        tasa_mensual_pct: 1,
        moneda: "ARS",
        modo: "simple",
        fecha_inicio: "2026-04-01",
        meses: 0,
      }),
    ).toThrow();
  });

  it("rechaza meses no entero", () => {
    expect(() =>
      proyectarLiquidaciones({
        capital_base: 1000,
        tasa_mensual_pct: 1,
        moneda: "ARS",
        modo: "simple",
        fecha_inicio: "2026-04-01",
        meses: 1.5,
      }),
    ).toThrow();
  });
});

describe("totalInteresesAcumulado", () => {
  it("array vacío = 0", () => {
    expect(totalInteresesAcumulado([])).toBe(0);
  });

  it("suma con redondeo final", () => {
    const liqs: Liquidacion[] = [
      { periodo: "2026-01-01", capital_base: 1000, tasa_aplicada_pct: 0.33, monto_interes: 3.3, moneda: "ARS" },
      { periodo: "2026-02-01", capital_base: 1000, tasa_aplicada_pct: 0.33, monto_interes: 3.3, moneda: "ARS" },
      { periodo: "2026-03-01", capital_base: 1000, tasa_aplicada_pct: 0.33, monto_interes: 3.3, moneda: "ARS" },
    ];
    expect(totalInteresesAcumulado(liqs)).toBe(9.9);
  });

  it("12 meses al 3% sobre 1M = 360.000 simple", () => {
    const projs = proyectarLiquidaciones({
      capital_base: 1_000_000,
      tasa_mensual_pct: 3,
      moneda: "ARS",
      modo: "simple",
      fecha_inicio: "2026-01-01",
      meses: 12,
    });
    expect(totalInteresesAcumulado(projs)).toBe(360_000);
  });
});
