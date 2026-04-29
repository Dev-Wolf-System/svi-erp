import { createHash } from "node:crypto";
import type { ContratoFciData } from "./schema";

/**
 * Payload canónico para hashear un contrato FCI — determinístico.
 *
 * Reglas (espejo de contrato-venta/canonical.ts):
 *   - Sólo campos legalmente relevantes. Email/teléfono/observaciones NO
 *     entran — el contrato sigue siendo el mismo si se actualizan.
 *   - Decimales con toFixed(2) para evitar 100 vs 100.00.
 *   - Fechas reducidas a YYYY-MM-DD.
 *   - Versión `v: 1` permite versionar el formato si más adelante el
 *     dictamen exige otros campos.
 */
export function canonicalContratoFciPayload(data: ContratoFciData): string {
  const numero = (n: number) => Number(n).toFixed(2);
  const fecha = (s: string) => s.slice(0, 10);

  const canonical = {
    v: 1,
    empresa: {
      cuit: data.empresa.cuit,
      razon_social: data.empresa.razon_social,
    },
    inversion: {
      numero_contrato: data.inversion.numero_contrato,
      fecha_inicio: fecha(data.inversion.fecha_inicio),
      fecha_vencimiento: data.inversion.fecha_vencimiento
        ? fecha(data.inversion.fecha_vencimiento)
        : null,
      moneda: data.inversion.moneda,
      capital_inicial: numero(data.inversion.capital_inicial),
      tasa_mensual_pct: numero(data.inversion.tasa_mensual_pct),
      tipo_instrumento: data.inversion.tipo_instrumento,
      estado_regulatorio: data.inversion.estado_regulatorio,
      firma_metodo: data.inversion.firma_metodo,
    },
    inversor: {
      nombre: data.inversor.nombre,
      documento_tipo: data.inversor.documento_tipo,
      documento_numero: data.inversor.documento_numero,
    },
  };

  return JSON.stringify(canonical, sortedKeysReplacer);
}

export function computeContratoFciHash(data: ContratoFciData): string {
  return createHash("sha256")
    .update(canonicalContratoFciPayload(data), "utf8")
    .digest("hex");
}

function sortedKeysReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});
}
