import { createHash } from "node:crypto";
import type { ContratoVentaData } from "./schema";

/**
 * Devuelve el payload canónico para hashear: una representación
 * determinística (orden de keys, normalización de números y strings)
 * de los campos legalmente relevantes del contrato.
 *
 * Reglas:
 *   - Sólo los campos que importan para identidad económica/legal del
 *     boleto van al hash. Teléfono, email, dirección, observaciones NO
 *     van — pueden cambiar sin que el contrato sea otro.
 *   - Números: toFixed(2) para fija precisión decimal — evita 100 vs 100.0.
 *   - Strings: trim + lowercase opcional para campos donde el caso no
 *     altera la identidad (no aplicamos a nombres porque sí importan).
 *   - Fechas: ISO YYYY-MM-DD (slice 0-10) para descartar TZ/hora.
 *
 * IMPORTANTE: cualquier cambio en este shape rompe la verificación de
 * todos los contratos previos. Si hay que cambiar, sumar versionado
 * (canonicalContratoPayloadV2) y elegir versión por `contrato_version`.
 */
export function canonicalContratoPayload(data: ContratoVentaData): string {
  const numero = (n: number) => Number(n).toFixed(2);
  const fecha = (s: string) => s.slice(0, 10);

  const canonical = {
    v: 1,
    empresa: {
      cuit: data.empresa.cuit,
      razon_social: data.empresa.razon_social,
    },
    venta: {
      numero_operacion: data.venta.numero_operacion,
      fecha: fecha(data.venta.fecha),
      moneda: data.venta.moneda,
      precio_venta: numero(data.venta.precio_venta),
      descuento: numero(data.venta.descuento),
      precio_final: numero(data.venta.precio_final),
      tipo_pago: data.venta.tipo_pago,
    },
    vehiculo: {
      marca: data.vehiculo.marca,
      modelo: data.vehiculo.modelo,
      anio: data.vehiculo.anio,
      dominio: data.vehiculo.dominio,
      chasis: data.vehiculo.chasis ?? null,
      motor: data.vehiculo.motor ?? null,
    },
    cliente: {
      tipo: data.cliente.tipo,
      nombre: data.cliente.nombre,
      apellido: data.cliente.apellido ?? null,
      documento_tipo: data.cliente.documento_tipo,
      documento_numero: data.cliente.documento_numero,
    },
    parte_pago: data.parte_pago
      ? {
          marca: data.parte_pago.marca,
          modelo: data.parte_pago.modelo,
          anio: data.parte_pago.anio,
          dominio: data.parte_pago.dominio,
          valor: numero(data.parte_pago.valor),
        }
      : null,
    financiacion: data.financiacion
      ? {
          banco_nombre: data.financiacion.banco_nombre,
          legajo: data.financiacion.legajo ?? null,
          monto_financiado: numero(data.financiacion.monto_financiado),
          cuotas: data.financiacion.cuotas,
          tasa_pct: numero(data.financiacion.tasa_pct),
        }
      : null,
  };

  return JSON.stringify(canonical, sortedKeysReplacer);
}

/**
 * SHA-256 hex del payload canónico.
 * Determinístico: misma data → mismo hash, siempre.
 */
export function computeContratoHash(data: ContratoVentaData): string {
  const canonical = canonicalContratoPayload(data);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Trunca el hash para mostrar en footer (4 + 4 caracteres). Se imprime
 * en cada página del PDF junto al hash completo en formato `XXXX:XXXX`
 * para que sea legible a ojo.
 */
export function shortHash(hash: string): string {
  if (hash.length < 8) return hash.toUpperCase();
  return `${hash.slice(0, 4)}:${hash.slice(-4)}`.toUpperCase();
}

/**
 * Construye la URL pública de verificación a partir de la base + numero_op.
 */
export function buildVerifyUrl(baseUrl: string, numeroOperacion: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/v/${encodeURIComponent(numeroOperacion)}`;
}

// JSON.stringify replacer que ordena keys alfabéticamente — necesario
// para que el hash sea determinístico independientemente del orden en
// que se construyan los objetos.
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
