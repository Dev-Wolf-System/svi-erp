import { describe, expect, it } from "vitest";
import { contratoVentaSchema, type ContratoVentaData } from "../schema";
import { renderContratoVenta } from "../render";

const baseData: ContratoVentaData = {
  empresa: {
    nombre: "SVI",
    razon_social: "Solo Vehículos Impecables S.A.",
    cuit: "30715432109",
    telefono: "+54 351 555 1234",
    email: "ventas@svi.com.ar",
  },
  sucursal: {
    nombre: "SVI Centro",
    direccion: "Av. Colón 1200, Córdoba",
  },
  venta: {
    numero_operacion: "0001-00000123",
    fecha: "2026-04-28",
    moneda: "ARS",
    precio_venta: 18_500_000,
    descuento: 500_000,
    precio_final: 18_000_000,
    tipo_pago: "contado",
    notas: "Entrega en 48hs",
  },
  vehiculo: {
    marca: "Toyota",
    modelo: "Corolla XEi CVT",
    anio: 2023,
    dominio: "AE123BC",
    chasis: "9BR53AHM5N0123456",
    motor: "2ZRFAEAB12345",
    color: "Blanco perlado",
    kilometros: 28500,
  },
  cliente: {
    tipo: "persona",
    nombre: "Juan Pablo",
    apellido: "García",
    documento_tipo: "DNI",
    documento_numero: "30123456",
    direccion: "Belgrano 450, Córdoba",
    telefono: "+54 9 351 612 0001",
    email: "jp.garcia@example.com",
  },
  parte_pago: null,
  financiacion: null,
};

describe("contratoVentaSchema", () => {
  it("valida data mínima correcta", () => {
    expect(() => contratoVentaSchema.parse(baseData)).not.toThrow();
  });

  it("rechaza moneda inválida", () => {
    expect(() =>
      contratoVentaSchema.parse({
        ...baseData,
        venta: { ...baseData.venta, moneda: "EUR" as never },
      }),
    ).toThrow();
  });

  it("rechaza tipo_pago inválido", () => {
    expect(() =>
      contratoVentaSchema.parse({
        ...baseData,
        venta: { ...baseData.venta, tipo_pago: "trueque" as never },
      }),
    ).toThrow();
  });

  it("rechaza precio_final negativo", () => {
    expect(() =>
      contratoVentaSchema.parse({
        ...baseData,
        venta: { ...baseData.venta, precio_final: -1 },
      }),
    ).toThrow();
  });

  it("rechaza CUIT empresa vacío", () => {
    expect(() =>
      contratoVentaSchema.parse({
        ...baseData,
        empresa: { ...baseData.empresa, cuit: "" },
      }),
    ).toThrow();
  });
});

describe("renderContratoVenta", () => {
  it("genera un Buffer PDF no vacío para venta contado", async () => {
    const buf = await renderContratoVenta(baseData);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  it("incluye sección de parte de pago cuando se pasa", async () => {
    const buf = await renderContratoVenta({
      ...baseData,
      venta: { ...baseData.venta, tipo_pago: "parte_pago" },
      parte_pago: {
        marca: "Volkswagen",
        modelo: "Gol Trend",
        anio: 2018,
        dominio: "AB123CD",
        valor: 6_500_000,
      },
    });
    expect(buf.byteLength).toBeGreaterThan(1000);
  }, 30_000);

  it("incluye sección de financiación cuando se pasa", async () => {
    const buf = await renderContratoVenta({
      ...baseData,
      venta: { ...baseData.venta, tipo_pago: "financiado" },
      financiacion: {
        banco_nombre: "Banco Galicia",
        legajo: "LG-2026-00041",
        monto_financiado: 12_000_000,
        cuotas: 36,
        tasa_pct: 84.5,
      },
    });
    expect(buf.byteLength).toBeGreaterThan(1000);
  }, 30_000);

  it("genera PDF para cliente empresa con CUIT", async () => {
    const buf = await renderContratoVenta({
      ...baseData,
      cliente: {
        tipo: "empresa",
        nombre: "Transportes del Sur S.R.L.",
        apellido: null,
        documento_tipo: "CUIT",
        documento_numero: "30712345678",
        direccion: "Ruta 9 Km 700",
        telefono: null,
        email: "compras@tdsur.com.ar",
      },
    });
    expect(buf.byteLength).toBeGreaterThan(1000);
  }, 30_000);

  it("falla rápido si la data es inválida", async () => {
    await expect(
      renderContratoVenta({
        ...baseData,
        venta: { ...baseData.venta, precio_final: -1 },
      }),
    ).rejects.toThrow();
  });
});
