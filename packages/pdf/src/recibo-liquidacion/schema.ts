import { z } from "zod";

/**
 * Schema del Recibo de pago de liquidación FCI.
 *
 * El recibo formaliza el pago de un período de liquidación al inversor.
 * Incluye la decisión del inversor sobre el destino del monto:
 *   - retirar: el dinero se entrega al inversor
 *   - reinvertir: se suma al capital_actual de la inversión
 */
export const reciboLiquidacionSchema = z.object({
  empresa: z.object({
    nombre: z.string().min(1),
    razon_social: z.string().min(1),
    cuit: z.string().min(11),
    telefono: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }),
  sucursal: z.object({
    nombre: z.string().min(1),
    direccion: z.string().nullable().optional(),
  }),
  inversor: z.object({
    nombre: z.string().min(1),
    documento_tipo: z.enum(["DNI", "CUIT", "CUIL"]),
    documento_numero: z.string().min(1),
    banco_nombre: z.string().nullable().optional(),
    cbu_ultimos4: z.string().nullable().optional(),
  }),
  inversion: z.object({
    numero_contrato: z.string().min(1),
    moneda: z.enum(["ARS", "USD"]).default("ARS"),
  }),
  liquidacion: z.object({
    /** YYYY-MM-01 (primer día del mes liquidado) */
    periodo: z.string().min(1),
    capital_base: z.number().nonnegative(),
    tasa_aplicada_pct: z.number().nonnegative(),
    monto_interes: z.number().nonnegative(),
    /** YYYY-MM-DD (día del pago efectivo) */
    fecha_pago: z.string().min(1),
    metodo_pago: z.enum([
      "transferencia",
      "efectivo",
      "cheque",
      "mercadopago",
      "compensacion",
      "otro",
    ]),
    comprobante_referencia: z.string().nullable().optional(),
    modo_pago_inversor: z.enum(["retirar", "reinvertir"]),
    /** Capital actual DESPUÉS de aplicar la decisión (igual al previo si retirar). */
    capital_actual_post: z.number().nonnegative(),
  }),
});

export type ReciboLiquidacionData = z.infer<typeof reciboLiquidacionSchema>;
