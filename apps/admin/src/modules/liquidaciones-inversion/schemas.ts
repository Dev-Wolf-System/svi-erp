import { z } from "zod";

export const ESTADOS_LIQUIDACION = ["pendiente", "pagada", "anulada"] as const;
export type EstadoLiquidacion = (typeof ESTADOS_LIQUIDACION)[number];

export const METODOS_PAGO = [
  "transferencia",
  "efectivo",
  "cheque",
  "mercadopago",
  "compensacion",
  "otro",
] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

/**
 * Period is a YYYY-MM-DD anchored to the first of the month.
 * Acepta también YYYY-MM y normaliza.
 */
const periodoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Formato YYYY-MM o YYYY-MM-DD requerido")
  .transform((v) => `${v.slice(0, 7)}-01`);

export const liquidacionGenerarSchema = z.object({
  inversion_id: z.string().uuid(),
  /** Si no se pasa, la action usa el primer día del mes actual del server. */
  periodo: periodoSchema.optional(),
});

export const liquidacionPagarSchema = z.object({
  id: z.string().uuid(),
  metodo_pago: z.enum(METODOS_PAGO),
  fecha_pago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha YYYY-MM-DD requerida")
    .optional(),
  comprobante_url: z.string().url().optional().nullable().or(z.literal("")),
});

export const liquidacionAnularSchema = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(3, "Motivo requerido (mínimo 3 caracteres)").max(500),
});

export const liquidacionFiltersSchema = z.object({
  estado: z.enum(ESTADOS_LIQUIDACION).optional(),
  inversor_id: z.string().uuid().optional(),
  inversion_id: z.string().uuid().optional(),
  periodo_desde: periodoSchema.optional(),
  periodo_hasta: periodoSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type LiquidacionGenerarInput = z.infer<typeof liquidacionGenerarSchema>;
export type LiquidacionPagarInput = z.infer<typeof liquidacionPagarSchema>;
export type LiquidacionAnularInput = z.infer<typeof liquidacionAnularSchema>;
export type LiquidacionFilters = z.infer<typeof liquidacionFiltersSchema>;

export const LABEL_ESTADO: Record<EstadoLiquidacion, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  anulada: "Anulada",
};

export const COLOR_ESTADO: Record<EstadoLiquidacion, string> = {
  pendiente: "bg-svi-warning/15 border-svi-warning/30 text-svi-warning",
  pagada: "bg-svi-success/15 border-svi-success/30 text-svi-success",
  anulada: "bg-svi-error/15 border-svi-error/30 text-svi-error",
};

export const LABEL_METODO_PAGO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  cheque: "Cheque",
  mercadopago: "Mercado Pago",
  compensacion: "Compensación",
  otro: "Otro",
};
