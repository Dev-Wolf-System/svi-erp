/**
 * Tipos del adaptador AFIP — replican la estructura WSFEv1 (Factura Electrónica).
 * El driver concreto (stub/sandbox/production) implementa la interfaz.
 *
 * Ref oficial:
 *   https://www.afip.gob.ar/ws/documentacion/wsfev1.asp
 */

/** Tipos de comprobante (codificación AFIP — tabla `getTiposCbte`) */
export const TIPO_COMPROBANTE = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
} as const;

export type TipoComprobante = (typeof TIPO_COMPROBANTE)[keyof typeof TIPO_COMPROBANTE];

/** Condiciones de IVA del receptor (RG 5616/2024) */
export const COND_IVA_RECEPTOR = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  RESPONSABLE_MONOTRIBUTO: 6,
  NO_CATEGORIZADO: 7,
} as const;

export type CondIvaReceptor = (typeof COND_IVA_RECEPTOR)[keyof typeof COND_IVA_RECEPTOR];

/** Documento del receptor */
export const DOC_TIPO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const;

export type DocTipo = (typeof DOC_TIPO)[keyof typeof DOC_TIPO];

export interface FacturaPayload {
  punto_venta: number;            // Ej: 1, 2, 3...
  tipo_comprobante: TipoComprobante;
  doc_tipo: DocTipo;
  doc_nro: string;                // CUIT 11 dígitos / DNI 7-8 / 0 si CF
  cond_iva_receptor: CondIvaReceptor;
  fecha_servicio?: string;        // YYYY-MM-DD (servicios), si aplica
  fecha_comprobante: string;      // YYYY-MM-DD
  importe_neto: number;           // sin IVA
  importe_iva: number;            // monto IVA total
  importe_total: number;          // neto + iva (+ otros tributos)
  alicuota_iva: 21 | 10.5 | 27 | 5 | 2.5 | 0;
  moneda: "PES" | "DOL";
  cotizacion_dolar?: number;      // requerido si moneda='DOL'
  concepto: 1 | 2 | 3;            // 1=Productos, 2=Servicios, 3=Productos y Servicios
}

/** Respuesta exitosa de AFIP al solicitar CAE */
export interface CaeResponse {
  cae: string;                    // 14 dígitos
  cae_vencimiento: string;        // YYYY-MM-DD
  numero_comprobante: number;     // Asignado por AFIP, secuencial por (PtoVta, TipoCbte)
  resultado: "A" | "R";           // A=Aprobado, R=Rechazado
  observaciones: string[];        // Códigos de observación si los hubiera
}

export interface ComprobanteId {
  punto_venta: number;
  tipo_comprobante: TipoComprobante;
  numero_comprobante: number;
}

export interface ComprobanteInfo extends CaeResponse {
  payload: FacturaPayload;
  emitido_at: string;             // ISO timestamp
}

/**
 * Adaptador AFIP — implementado por StubDriver, SandboxDriver, ProductionDriver.
 * El sistema usa exclusivamente esta interfaz — nunca conoce el driver concreto.
 */
export interface AfipFacturador {
  /** Nombre del driver (para auditoría — `afip_driver` en tabla ventas) */
  readonly driverName: "stub" | "sandbox" | "production";

  /** Solicita CAE para un nuevo comprobante */
  emitirFactura(payload: FacturaPayload): Promise<CaeResponse>;

  /** Consulta un comprobante ya emitido (para reconciliación) */
  consultarComprobante(id: ComprobanteId): Promise<ComprobanteInfo | null>;

  /** Próximo número que asignaría AFIP (para preview en UI antes de emitir) */
  obtenerProximoNumero(puntoVenta: number, tipo: TipoComprobante): Promise<number>;
}

export class AfipError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AfipError";
  }
}
