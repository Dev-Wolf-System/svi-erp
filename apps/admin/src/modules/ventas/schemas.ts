import { z } from "zod";

export const ESTADOS_VENTA = [
  "reserva",
  "documentacion",
  "aprobado",
  "entregado",
  "finalizado",
  "anulado",
] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];

export const TIPOS_PAGO = ["contado", "financiado", "parte_pago"] as const;
export type TipoPago = (typeof TIPOS_PAGO)[number];

export const MONEDAS = ["ARS", "USD"] as const;

const positiveDecimal = z.coerce.number().nonnegative();

export const ventaCreateSchema = z
  .object({
    sucursal_id: z.string().uuid("Seleccioná una sucursal"),
    vehiculo_id: z.string().uuid("Seleccioná un vehículo"),
    cliente_id: z.string().uuid("Seleccioná un cliente"),
    vendedor_id: z.string().uuid().optional().nullable(),

    precio_venta: positiveDecimal,
    moneda: z.enum(MONEDAS).default("ARS"),
    descuento: positiveDecimal.default(0),
    precio_final: positiveDecimal,

    tipo_pago: z.enum(TIPOS_PAGO),

    // Parte de pago — sólo si tipo_pago === 'parte_pago'
    vehiculo_parte_id: z.string().uuid().optional().nullable(),
    valor_parte: positiveDecimal.optional().nullable(),

    // Financiación — sólo si tipo_pago === 'financiado'
    banco_id: z.string().uuid().optional().nullable(),
    legajo_banco: z.string().max(50).optional().nullable(),
    monto_financiado: positiveDecimal.optional().nullable(),
    cuotas: z.coerce.number().int().min(1).max(120).optional().nullable(),
    tasa_banco: z.coerce.number().min(0).max(999.99).optional().nullable(),

    // Comisión snapshot — opcional al crear, se completa al avanzar de estado
    comision_pct: z.coerce.number().min(0).max(100).optional().nullable(),
    comision_monto: positiveDecimal.optional().nullable(),

    notas: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.descuento <= d.precio_venta, {
    message: "El descuento no puede superar el precio de lista",
    path: ["descuento"],
  })
  .refine(
    (d) =>
      d.tipo_pago !== "parte_pago" ||
      (d.vehiculo_parte_id && d.valor_parte != null && d.valor_parte > 0),
    {
      message: "Especificá vehículo y valor para parte de pago",
      path: ["vehiculo_parte_id"],
    },
  )
  .refine(
    (d) =>
      d.tipo_pago !== "financiado" ||
      (d.banco_id &&
        d.monto_financiado != null &&
        d.monto_financiado > 0 &&
        d.cuotas != null &&
        d.tasa_banco != null),
    {
      message: "Completá banco, monto, cuotas y tasa para financiación",
      path: ["banco_id"],
    },
  )
  .refine(
    (d) =>
      (d.comision_pct == null && d.comision_monto == null) ||
      (d.comision_pct != null && d.comision_monto != null),
    {
      message: "Comisión: porcentaje y monto deben ir juntos",
      path: ["comision_pct"],
    },
  );

export const ventaCambioEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS_VENTA),
});

export const ventaAnularSchema = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(3).max(500),
});

export const ventaFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(ESTADOS_VENTA).optional(),
  sucursal_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type VentaCreateInput = z.infer<typeof ventaCreateSchema>;
export type VentaCambioEstadoInput = z.infer<typeof ventaCambioEstadoSchema>;
export type VentaFilters = z.infer<typeof ventaFiltersSchema>;

/** Etiquetas para mostrar el estado en UI */
export const LABEL_ESTADO: Record<EstadoVenta, string> = {
  reserva: "Reserva",
  documentacion: "Documentación",
  aprobado: "Aprobado",
  entregado: "Entregado",
  finalizado: "Finalizado",
  anulado: "Anulado",
};

/** Color de cada columna del Kanban (clases Tailwind) */
export const COLOR_ESTADO: Record<EstadoVenta, string> = {
  reserva: "bg-svi-info/15 border-svi-info/30 text-svi-info",
  documentacion: "bg-svi-warning/15 border-svi-warning/30 text-svi-warning",
  aprobado: "bg-svi-gold/15 border-svi-gold/30 text-svi-gold",
  entregado: "bg-svi-success/15 border-svi-success/30 text-svi-success",
  finalizado: "bg-svi-success/25 border-svi-success/50 text-svi-success",
  anulado: "bg-svi-error/15 border-svi-error/30 text-svi-error",
};

export const LABEL_TIPO_PAGO: Record<TipoPago, string> = {
  contado: "Contado",
  financiado: "Financiado",
  parte_pago: "Parte de pago",
};
