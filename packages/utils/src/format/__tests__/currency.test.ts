import { describe, expect, it } from "vitest";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "../currency";

describe("formatCurrency", () => {
  it("formatea ARS por default con locale es-AR", () => {
    const result = formatCurrency(1500000);
    expect(result).toContain("1.500.000");
    expect(result).toMatch(/\$/);
  });

  it("acepta USD", () => {
    const result = formatCurrency(25000.5, "USD");
    expect(result).toContain("25.000,50");
  });

  it("retorna '—' para valores nulos/inválidos", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency("")).toBe("—");
    expect(formatCurrency("abc")).toBe("—");
  });

  it("acepta strings numéricos", () => {
    expect(formatCurrency("1500")).toContain("1.500,00");
  });
});

describe("formatCurrencyCompact", () => {
  it("usa notación compacta", () => {
    const result = formatCurrencyCompact(1500000);
    expect(result).toMatch(/M/);
  });
});

describe("formatPercent", () => {
  it("formatea 12.5 como 12,50%", () => {
    expect(formatPercent(12.5)).toContain("12,50");
    expect(formatPercent(12.5)).toContain("%");
  });
});
