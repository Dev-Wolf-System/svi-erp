import { describe, it, expect } from "vitest";
import {
  reciboLiquidacionSchema,
  type ReciboLiquidacionData,
} from "../schema";
import {
  canonicalReciboLiquidacionPayload,
  computeReciboLiquidacionHash,
} from "../canonical";
import { renderReciboLiquidacion } from "../render";

const baseData: ReciboLiquidacionData = {
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
  inversor: {
    nombre: "Juan Pérez",
    documento_tipo: "DNI",
    documento_numero: "30123456",
    banco_nombre: "Banco Galicia",
    cbu_ultimos4: "5678",
  },
  inversion: {
    numero_contrato: "SVI-AGU-2026-00001",
    moneda: "ARS",
  },
  liquidacion: {
    periodo: "2026-04-01",
    capital_base: 5_000_000,
    tasa_aplicada_pct: 4.5,
    monto_interes: 225_000,
    fecha_pago: "2026-05-02",
    metodo_pago: "transferencia",
    comprobante_referencia: "TX-2026-0123",
    modo_pago_inversor: "retirar",
    capital_actual_post: 5_000_000,
  },
};

describe("reciboLiquidacionSchema", () => {
  it("acepta data mínima válida", () => {
    expect(() => reciboLiquidacionSchema.parse(baseData)).not.toThrow();
  });

  it("rechaza modo_pago_inversor inválido", () => {
    expect(() =>
      reciboLiquidacionSchema.parse({
        ...baseData,
        liquidacion: {
          ...baseData.liquidacion,
          modo_pago_inversor: "donar" as never,
        },
      }),
    ).toThrow();
  });

  it("rechaza monto_interes negativo", () => {
    expect(() =>
      reciboLiquidacionSchema.parse({
        ...baseData,
        liquidacion: { ...baseData.liquidacion, monto_interes: -1 },
      }),
    ).toThrow();
  });
});

describe("canonical + hash", () => {
  it("hash determinístico", () => {
    expect(computeReciboLiquidacionHash(baseData)).toBe(
      computeReciboLiquidacionHash(baseData),
    );
  });

  it("modo distinto produce hash distinto", () => {
    const a = computeReciboLiquidacionHash(baseData);
    const b = computeReciboLiquidacionHash({
      ...baseData,
      liquidacion: {
        ...baseData.liquidacion,
        modo_pago_inversor: "reinvertir",
        capital_actual_post: 5_225_000,
      },
    });
    expect(a).not.toBe(b);
  });

  it("formato fecha distinto pero mismo día → mismo hash", () => {
    const a = computeReciboLiquidacionHash(baseData);
    const b = computeReciboLiquidacionHash({
      ...baseData,
      liquidacion: {
        ...baseData.liquidacion,
        fecha_pago: "2026-05-02T15:30:00Z",
      },
    });
    expect(a).toBe(b);
  });

  it("v: 1 en payload canónico", () => {
    const out = canonicalReciboLiquidacionPayload(baseData);
    const parsed = JSON.parse(out) as { v: number };
    expect(parsed.v).toBe(1);
  });
});

describe("renderReciboLiquidacion", () => {
  it("genera Buffer PDF en modo retirar", async () => {
    const { buffer, hash } = await renderReciboLiquidacion(baseData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(hash).toBeNull(); // sin verifyBaseUrl no hay hash en el PDF
  }, 30_000);

  it("genera Buffer PDF en modo reinvertir con sello", async () => {
    const { buffer, hash } = await renderReciboLiquidacion(
      {
        ...baseData,
        liquidacion: {
          ...baseData.liquidacion,
          modo_pago_inversor: "reinvertir",
          capital_actual_post: 5_225_000,
        },
      },
      {
        verifyBaseUrl: "https://svi-erp.test",
        liquidacionId: "00000000-0000-0000-0000-000000000001",
        contratoVersion: 1,
      },
    );
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);

  it("falla rápido con data inválida", async () => {
    await expect(
      renderReciboLiquidacion({
        ...baseData,
        liquidacion: { ...baseData.liquidacion, monto_interes: -1 },
      }),
    ).rejects.toThrow();
  });
});
