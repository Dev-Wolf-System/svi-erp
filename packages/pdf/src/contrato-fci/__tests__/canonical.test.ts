import { describe, it, expect } from "vitest";
import {
  canonicalContratoFciPayload,
  computeContratoFciHash,
} from "../canonical";
import type { ContratoFciData } from "../schema";

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
    fecha_inicio: "2026-04-29T15:00:00Z",
    fecha_vencimiento: null,
    moneda: "ARS",
    capital_inicial: 5_000_000,
    tasa_mensual_pct: 4.5,
    tipo_instrumento: "mutuo",
    estado_regulatorio: "pre_dictamen",
    firma_metodo: "presencial",
    observaciones: "puede cambiar sin invalidar el hash",
  },
  inversor: {
    nombre: "Juan Pérez",
    documento_tipo: "DNI",
    documento_numero: "30123456",
    email: "jp@example.com",
    telefono: "+54 9 351 555 0001",
    banco_nombre: "Banco Galicia",
    cbu_ultimos4: "5678",
  },
};

describe("canonicalContratoFciPayload", () => {
  it("es determinístico", () => {
    expect(canonicalContratoFciPayload(baseData)).toBe(
      canonicalContratoFciPayload(baseData),
    );
  });

  it("ignora campos no legales (email, teléfono, observaciones, banco)", () => {
    const a = canonicalContratoFciPayload(baseData);
    const b = canonicalContratoFciPayload({
      ...baseData,
      inversion: { ...baseData.inversion, observaciones: "DISTINTO" },
      inversor: {
        ...baseData.inversor,
        email: "otro@x.com",
        telefono: "0000",
        banco_nombre: "Otro Banco",
        cbu_ultimos4: "9999",
      },
    });
    expect(a).toBe(b);
  });

  it("detecta cambios en campos legales", () => {
    const original = canonicalContratoFciPayload(baseData);

    const capCambiado = canonicalContratoFciPayload({
      ...baseData,
      inversion: { ...baseData.inversion, capital_inicial: 5_000_001 },
    });
    expect(capCambiado).not.toBe(original);

    const tasaCambiada = canonicalContratoFciPayload({
      ...baseData,
      inversion: { ...baseData.inversion, tasa_mensual_pct: 4.51 },
    });
    expect(tasaCambiada).not.toBe(original);

    const dniCambiado = canonicalContratoFciPayload({
      ...baseData,
      inversor: { ...baseData.inversor, documento_numero: "30123457" },
    });
    expect(dniCambiado).not.toBe(original);

    const tipoCambiado = canonicalContratoFciPayload({
      ...baseData,
      inversion: { ...baseData.inversion, tipo_instrumento: "fideicomiso" },
    });
    expect(tipoCambiado).not.toBe(original);
  });

  it("normaliza fecha (mismo día con distinto hora produce mismo hash)", () => {
    const a = computeContratoFciHash(baseData);
    const b = computeContratoFciHash({
      ...baseData,
      inversion: {
        ...baseData.inversion,
        fecha_inicio: "2026-04-29T23:59:59-03:00",
      },
    });
    expect(a).toBe(b);
  });

  it("normaliza decimales (5_000_000 vs 5_000_000.0)", () => {
    const a = computeContratoFciHash(baseData);
    const b = computeContratoFciHash({
      ...baseData,
      inversion: {
        ...baseData.inversion,
        capital_inicial: 5_000_000.0,
        tasa_mensual_pct: 4.5,
      },
    });
    expect(a).toBe(b);
  });

  it("incluye versión 'v: 1'", () => {
    const out = canonicalContratoFciPayload(baseData);
    const parsed = JSON.parse(out) as { v: number };
    expect(parsed.v).toBe(1);
  });
});

describe("computeContratoFciHash", () => {
  it("devuelve SHA-256 hex de 64 caracteres", () => {
    expect(computeContratoFciHash(baseData)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes distintos para regulatorio distinto", () => {
    const a = computeContratoFciHash(baseData);
    const b = computeContratoFciHash({
      ...baseData,
      inversion: {
        ...baseData.inversion,
        estado_regulatorio: "vigente",
      },
    });
    expect(a).not.toBe(b);
  });
});
