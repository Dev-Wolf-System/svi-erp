import { describe, it, expect } from "vitest";
import {
  canonicalContratoPayload,
  computeContratoHash,
  shortHash,
  buildVerifyUrl,
} from "../canonical";
import type { ContratoVentaData } from "../schema";

const baseData: ContratoVentaData = {
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
  venta: {
    numero_operacion: "SVI-AGU-2026-00001",
    fecha: "2026-04-28T15:30:00Z",
    moneda: "ARS",
    precio_venta: 18_500_000,
    descuento: 500_000,
    precio_final: 18_000_000,
    tipo_pago: "contado",
    notas: "puede cambiar",
  },
  vehiculo: {
    marca: "Toyota",
    modelo: "Corolla XEi",
    anio: 2023,
    dominio: "AE123BC",
    chasis: "9BR53AHM5N0123456",
    motor: "2ZRFAEAB12345",
    color: "Blanco",
    kilometros: 28500,
  },
  cliente: {
    tipo: "persona",
    nombre: "Juan Pablo",
    apellido: "García",
    documento_tipo: "DNI",
    documento_numero: "30123456",
    direccion: "Belgrano 450",
    telefono: "+54 9 351 612 0001",
    email: "jp@example.com",
  },
  parte_pago: null,
  financiacion: null,
};

describe("canonicalContratoPayload", () => {
  it("es determinístico: mismo input → mismo output", () => {
    const a = canonicalContratoPayload(baseData);
    const b = canonicalContratoPayload(baseData);
    expect(a).toBe(b);
  });

  it("ignora cambios en campos NO legales (notas, dirección, teléfono, email)", () => {
    const a = canonicalContratoPayload(baseData);
    const b = canonicalContratoPayload({
      ...baseData,
      venta: { ...baseData.venta, notas: "TOTALMENTE DISTINTO" },
      cliente: {
        ...baseData.cliente,
        direccion: "Otra calle 999",
        telefono: "0000",
        email: "otro@x.com",
      },
    });
    expect(a).toBe(b);
  });

  it("detecta cambios en campos legales (precio, dominio, DNI)", () => {
    const original = canonicalContratoPayload(baseData);

    const precioModificado = canonicalContratoPayload({
      ...baseData,
      venta: { ...baseData.venta, precio_final: 18_000_001 },
    });
    expect(precioModificado).not.toBe(original);

    const dominioModificado = canonicalContratoPayload({
      ...baseData,
      vehiculo: { ...baseData.vehiculo, dominio: "AE123BD" },
    });
    expect(dominioModificado).not.toBe(original);

    const dniModificado = canonicalContratoPayload({
      ...baseData,
      cliente: { ...baseData.cliente, documento_numero: "30123457" },
    });
    expect(dniModificado).not.toBe(original);
  });

  it("normaliza fecha — mismo día con distinto hora/TZ produce mismo hash", () => {
    const a = computeContratoHash(baseData);
    const b = computeContratoHash({
      ...baseData,
      venta: { ...baseData.venta, fecha: "2026-04-28T23:59:59-03:00" },
    });
    expect(a).toBe(b);
  });

  it("normaliza decimales — 100 y 100.00 producen mismo hash", () => {
    const a = computeContratoHash(baseData);
    const b = computeContratoHash({
      ...baseData,
      venta: { ...baseData.venta, precio_final: 18_000_000.0 },
    });
    expect(a).toBe(b);
  });

  it("orden de keys del input no afecta el output", () => {
    // Construye con keys en orden inverso simulando otro origen
    const reordered: ContratoVentaData = {
      financiacion: null,
      parte_pago: null,
      cliente: { ...baseData.cliente },
      vehiculo: { ...baseData.vehiculo },
      venta: { ...baseData.venta },
      sucursal: { ...baseData.sucursal },
      empresa: { ...baseData.empresa },
    } as ContratoVentaData;
    expect(canonicalContratoPayload(reordered)).toBe(
      canonicalContratoPayload(baseData),
    );
  });

  it("incluye versión 'v: 1' al inicio", () => {
    const out = canonicalContratoPayload(baseData);
    const parsed = JSON.parse(out) as { v: number };
    expect(parsed.v).toBe(1);
  });
});

describe("computeContratoHash", () => {
  it("devuelve SHA-256 hex de 64 caracteres", () => {
    const hash = computeContratoHash(baseData);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes distintos para datos legalmente distintos", () => {
    const a = computeContratoHash(baseData);
    const b = computeContratoHash({
      ...baseData,
      cliente: { ...baseData.cliente, nombre: "Otro" },
    });
    expect(a).not.toBe(b);
  });
});

describe("shortHash", () => {
  it("formato XXXX:XXXX en mayúsculas", () => {
    expect(shortHash("3f2a8b91abcdef0123456789")).toBe("3F2A:6789");
  });

  it("hash corto no truncado retorna mayúsculas tal cual", () => {
    expect(shortHash("abc")).toBe("ABC");
  });
});

describe("buildVerifyUrl", () => {
  it("compone URL canónica /v/<numero_op>", () => {
    expect(buildVerifyUrl("https://app.svi.com.ar", "SVI-AGU-2026-00001")).toBe(
      "https://app.svi.com.ar/v/SVI-AGU-2026-00001",
    );
  });

  it("tolera trailing slash en baseUrl", () => {
    expect(buildVerifyUrl("https://app.svi.com.ar/", "X-1")).toBe(
      "https://app.svi.com.ar/v/X-1",
    );
  });

  it("URL-encodea el numero_op si tiene caracteres especiales", () => {
    expect(buildVerifyUrl("https://x.com", "OP/2026")).toBe(
      "https://x.com/v/OP%2F2026",
    );
  });
});
