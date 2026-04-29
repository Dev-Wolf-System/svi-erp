import { describe, it, expect } from "vitest";
import { contratoFciSchema, type ContratoFciData } from "../schema";
import { renderContratoFci } from "../render";

const baseData: ContratoFciData = {
  empresa: {
    nombre: "SVI",
    razon_social: "Solo Vehículos Impecables S.A.",
    cuit: "30715432109",
    telefono: "+54 351 555 1234",
    email: "ventas@svi.com.ar",
  },
  sucursal: {
    nombre: "SVI Aguilares",
    direccion: "Belgrano 100",
  },
  inversion: {
    numero_contrato: "SVI-AGU-2026-00001",
    fecha_inicio: "2026-04-29",
    fecha_vencimiento: null,
    moneda: "ARS",
    capital_inicial: 5_000_000,
    tasa_mensual_pct: 4.5,
    tipo_instrumento: "mutuo",
    estado_regulatorio: "pre_dictamen",
    firma_metodo: "presencial",
    observaciones: null,
  },
  inversor: {
    nombre: "Juan Pérez",
    documento_tipo: "DNI",
    documento_numero: "30123456",
    email: "jp@example.com",
    telefono: null,
    banco_nombre: "Banco Galicia",
    cbu_ultimos4: "5678",
  },
};

describe("contratoFciSchema", () => {
  it("valida data mínima correcta", () => {
    expect(() => contratoFciSchema.parse(baseData)).not.toThrow();
  });

  it("rechaza tipo_instrumento inválido", () => {
    expect(() =>
      contratoFciSchema.parse({
        ...baseData,
        inversion: {
          ...baseData.inversion,
          tipo_instrumento: "criptomoneda" as never,
        },
      }),
    ).toThrow();
  });

  it("rechaza moneda inválida", () => {
    expect(() =>
      contratoFciSchema.parse({
        ...baseData,
        inversion: { ...baseData.inversion, moneda: "EUR" as never },
      }),
    ).toThrow();
  });

  it("rechaza capital cero o negativo", () => {
    expect(() =>
      contratoFciSchema.parse({
        ...baseData,
        inversion: { ...baseData.inversion, capital_inicial: 0 },
      }),
    ).toThrow();
    expect(() =>
      contratoFciSchema.parse({
        ...baseData,
        inversion: { ...baseData.inversion, capital_inicial: -1 },
      }),
    ).toThrow();
  });
});

describe("renderContratoFci", () => {
  it("genera un Buffer PDF válido sin sello (sin verifyBaseUrl)", async () => {
    const { buffer, hash } = await renderContratoFci(baseData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(hash).toBeNull();
  }, 30_000);

  it("agrega sello de integridad cuando se pasa verifyBaseUrl", async () => {
    const { buffer, hash } = await renderContratoFci(baseData, {
      verifyBaseUrl: "https://svi-erp.test",
      contratoVersion: 2,
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);

  it("renderiza para fideicomiso con vencimiento definido", async () => {
    const { buffer } = await renderContratoFci({
      ...baseData,
      inversion: {
        ...baseData.inversion,
        tipo_instrumento: "fideicomiso",
        fecha_vencimiento: "2027-04-29",
      },
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
  }, 30_000);

  it("renderiza para FCI CNV con estado_regulatorio vigente", async () => {
    const { buffer } = await renderContratoFci({
      ...baseData,
      inversion: {
        ...baseData.inversion,
        tipo_instrumento: "fci_cnv",
        estado_regulatorio: "vigente",
      },
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
  }, 30_000);

  it("falla rápido si la data es inválida", async () => {
    await expect(
      renderContratoFci({
        ...baseData,
        inversion: { ...baseData.inversion, capital_inicial: -1 },
      }),
    ).rejects.toThrow();
  });
});
