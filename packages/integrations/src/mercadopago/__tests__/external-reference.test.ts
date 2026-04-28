import { describe, it, expect } from "vitest";
import { buildExternalReference, parseExternalReference } from "../client";

const SUC = "00000000-0000-0000-0000-000000000010";
const REF = "11111111-1111-1111-1111-111111111111";

describe("buildExternalReference", () => {
  it("arma string canónico tipo:sucursal:referencia", () => {
    expect(buildExternalReference("venta_seña", SUC, REF)).toBe(
      `venta_seña:${SUC}:${REF}`,
    );
  });

  it("preserva tipos arbitrarios (no valida contra enum)", () => {
    expect(buildExternalReference("otro", SUC, REF)).toBe(`otro:${SUC}:${REF}`);
  });
});

describe("parseExternalReference", () => {
  it("recupera los 3 campos de un external_reference válido", () => {
    const ref = buildExternalReference("venta_seña", SUC, REF);
    expect(parseExternalReference(ref)).toEqual({
      tipo: "venta_seña",
      sucursal_id: SUC,
      referencia_id: REF,
    });
  });

  it("es inverso de buildExternalReference (round-trip)", () => {
    const built = buildExternalReference("venta_saldo", SUC, REF);
    const parsed = parseExternalReference(built);
    expect(parsed).not.toBeNull();
    expect(buildExternalReference(parsed!.tipo, parsed!.sucursal_id, parsed!.referencia_id)).toBe(
      built,
    );
  });

  it("retorna null si faltan partes", () => {
    expect(parseExternalReference("venta_seña")).toBeNull();
    expect(parseExternalReference("venta_seña:sucursal-only")).toBeNull();
  });

  it("retorna null si sobran partes (no hace split tolerante)", () => {
    expect(parseExternalReference(`a:b:c:d`)).toBeNull();
  });

  it("retorna null para string vacío", () => {
    expect(parseExternalReference("")).toBeNull();
  });
});
