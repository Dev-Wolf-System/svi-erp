import {
  AfipError,
  type AfipFacturador,
  type CaeResponse,
  type ComprobanteId,
  type ComprobanteInfo,
  type FacturaPayload,
} from "./types";

/**
 * Driver stub para desarrollo y CI.
 *
 * Genera CAE simulado con formato real (14 dígitos) y vencimiento +10 días.
 * NO requiere certificado AFIP ni red — funciona offline.
 *
 * Persiste comprobantes en memoria (Map por proceso). En tests se resetea
 * con `__resetStubState()`. En dev se mantiene mientras viva el proceso Next.
 */
export class AfipStubDriver implements AfipFacturador {
  readonly driverName = "stub" as const;

  private comprobantes = new Map<string, ComprobanteInfo>();
  private contadores = new Map<string, number>();      // key: `${pv}-${tipo}` → último número

  async emitirFactura(payload: FacturaPayload): Promise<CaeResponse> {
    this.validarPayload(payload);

    const numero = this.proximoNumeroSync(payload.punto_venta, payload.tipo_comprobante);
    const cae = this.generarCae();
    const cae_vencimiento = this.fechaVencimientoCae();

    const response: CaeResponse = {
      cae,
      cae_vencimiento,
      numero_comprobante: numero,
      resultado: "A",
      observaciones: [],
    };

    const key = this.keyComprobante({
      punto_venta: payload.punto_venta,
      tipo_comprobante: payload.tipo_comprobante,
      numero_comprobante: numero,
    });

    this.comprobantes.set(key, {
      ...response,
      payload,
      emitido_at: new Date().toISOString(),
    });

    return response;
  }

  async consultarComprobante(id: ComprobanteId): Promise<ComprobanteInfo | null> {
    return this.comprobantes.get(this.keyComprobante(id)) ?? null;
  }

  async obtenerProximoNumero(puntoVenta: number, tipo: number): Promise<number> {
    const key = `${puntoVenta}-${tipo}`;
    return (this.contadores.get(key) ?? 0) + 1;
  }

  // ─── interno ────────────────────────────────────────────────────────────

  private proximoNumeroSync(puntoVenta: number, tipo: number): number {
    const key = `${puntoVenta}-${tipo}`;
    const next = (this.contadores.get(key) ?? 0) + 1;
    this.contadores.set(key, next);
    return next;
  }

  /**
   * CAE real: 14 dígitos. Los primeros 8 codifican fecha (YYYYMMDD)
   * y los 6 siguientes son secuenciales del CAEA — acá los aleatorizamos.
   */
  private generarCae(): string {
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`;
    const secuencia = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    return `${fecha}${secuencia}`;
  }

  /** AFIP da CAE válido por 10 días corridos */
  private fechaVencimientoCae(): string {
    const v = new Date();
    v.setDate(v.getDate() + 10);
    return v.toISOString().slice(0, 10);
  }

  private keyComprobante(id: ComprobanteId): string {
    return `${id.punto_venta}-${id.tipo_comprobante}-${id.numero_comprobante}`;
  }

  private validarPayload(p: FacturaPayload): void {
    if (p.punto_venta < 1 || p.punto_venta > 99999) {
      throw new AfipError("punto_venta fuera de rango", "10015");
    }
    if (p.importe_total < 0) {
      throw new AfipError("importe_total no puede ser negativo", "10048");
    }
    // Tolerancia 0.02 por redondeos (AFIP es laxo en esto)
    const calculado = p.importe_neto + p.importe_iva;
    if (Math.abs(calculado - p.importe_total) > 0.02) {
      throw new AfipError(
        `importe_total (${p.importe_total}) ≠ neto + iva (${calculado})`,
        "10063",
      );
    }
    if (p.moneda === "DOL" && !p.cotizacion_dolar) {
      throw new AfipError("cotizacion_dolar requerido si moneda=DOL", "10018");
    }
    if (p.doc_tipo === 80 && p.doc_nro.replace(/\D/g, "").length !== 11) {
      throw new AfipError("CUIT debe tener 11 dígitos", "10006");
    }
  }

  /** Solo para tests — resetea el estado en memoria */
  __resetState(): void {
    this.comprobantes.clear();
    this.contadores.clear();
  }
}
