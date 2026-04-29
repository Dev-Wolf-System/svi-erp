import { createHash } from "node:crypto";
import type { ReciboLiquidacionData } from "./schema";

/**
 * Payload canónico del recibo. Incluye TODOS los campos económicos y la
 * decisión del inversor — un recibo es un acto puntual e inmutable, así
 * que no hay distinción "campo legal vs no legal" como en el contrato.
 *
 * Si el operador necesita corregir un dato del recibo, lo correcto es
 * anular y emitir uno nuevo, no editar.
 */
export function canonicalReciboLiquidacionPayload(
  data: ReciboLiquidacionData,
): string {
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
      moneda: data.inversion.moneda,
    },
    inversor: {
      nombre: data.inversor.nombre,
      documento_tipo: data.inversor.documento_tipo,
      documento_numero: data.inversor.documento_numero,
    },
    liquidacion: {
      periodo: fecha(data.liquidacion.periodo),
      capital_base: numero(data.liquidacion.capital_base),
      tasa_aplicada_pct: numero(data.liquidacion.tasa_aplicada_pct),
      monto_interes: numero(data.liquidacion.monto_interes),
      fecha_pago: fecha(data.liquidacion.fecha_pago),
      metodo_pago: data.liquidacion.metodo_pago,
      modo_pago_inversor: data.liquidacion.modo_pago_inversor,
      capital_actual_post: numero(data.liquidacion.capital_actual_post),
    },
  };

  return JSON.stringify(canonical, sortedKeysReplacer);
}

export function computeReciboLiquidacionHash(
  data: ReciboLiquidacionData,
): string {
  return createHash("sha256")
    .update(canonicalReciboLiquidacionPayload(data), "utf8")
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
