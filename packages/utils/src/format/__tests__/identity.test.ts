import { describe, expect, it } from "vitest";
import { formatCuit, isValidCuit, formatPatente, formatDni } from "../identity";

describe("formatCuit", () => {
  it("formatea CUIT con guiones", () => {
    expect(formatCuit("20123456789")).toBe("20-12345678-9");
  });
  it("retorna '—' si vacío", () => {
    expect(formatCuit(null)).toBe("—");
  });
});

describe("isValidCuit", () => {
  it("valida CUIT real (DV calculado)", () => {
    // 20-12345678 → DV = 6
    expect(isValidCuit("20-12345678-6")).toBe(true);
  });
  it("rechaza CUIT con dígito verificador inválido", () => {
    expect(isValidCuit("20-12345678-9")).toBe(false);
  });
  it("rechaza longitud incorrecta", () => {
    expect(isValidCuit("123")).toBe(false);
  });
  it("rechaza vacío", () => {
    expect(isValidCuit(null)).toBe(false);
    expect(isValidCuit("")).toBe(false);
  });
});

describe("formatPatente", () => {
  it("uppercase + sin espacios", () => {
    expect(formatPatente("ab 123 cd")).toBe("AB123CD");
  });
});

describe("formatDni", () => {
  it("agrega separador de miles", () => {
    expect(formatDni("31541234")).toBe("31.541.234");
  });
});
