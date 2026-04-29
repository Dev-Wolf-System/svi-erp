import { z } from "zod";

export const ESTADOS_INVERSION = ["activa", "suspendida", "finalizada"] as const;
export type EstadoInversion = (typeof ESTADOS_INVERSION)[number];

export const TIPOS_INSTRUMENTO = [
  "mutuo",
  "fideicomiso",
  "fci_cnv",
  "prestamo_participativo",
  "otro",
] as const;
export type TipoInstrumento = (typeof TIPOS_INSTRUMENTO)[number];

export const ESTADOS_REGULATORIOS = [
  "pre_dictamen",
  "vigente",
  "ajuste_requerido",
] as const;
export type EstadoRegulatorio = (typeof ESTADOS_REGULATORIOS)[number];

export const MONEDAS = ["ARS", "USD"] as const;

const positiveDecimal = z.coerce.number().positive("Debe ser mayor a 0");
const nonNegativeDecimal = z.coerce.number().nonnegative();

export const inversionCreateSchema = z
  .object({
    inversor_id: z.string().uuid("Seleccioná un inversor"),
    sucursal_id: z.string().uuid().optional().nullable(),

    capital_inicial: positiveDecimal,
    moneda: z.enum(MONEDAS).default("ARS"),
    tasa_mensual: nonNegativeDecimal.refine((v) => v <= 99.99, "Tasa fuera de rango"),

    fecha_inicio: z.string().min(10, "Fecha requerida"), // YYYY-MM-DD
    fecha_vencimiento: z.string().optional().nullable(),

    tipo_instrumento: z.enum(TIPOS_INSTRUMENTO).default("mutuo"),
    estado_regulatorio: z.enum(ESTADOS_REGULATORIOS).default("pre_dictamen"),
    firma_metodo: z.string().max(30).default("presencial"),

    config: z.record(z.string(), z.unknown()).default({}),
    observaciones: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (d) =>
      !d.fecha_vencimiento ||
      new Date(d.fecha_vencimiento) > new Date(d.fecha_inicio),
    {
      message: "El vencimiento debe ser posterior al inicio",
      path: ["fecha_vencimiento"],
    },
  );

export const inversionUpdateSchema = z.object({
  id: z.string().uuid(),
  fecha_vencimiento: z.string().optional().nullable(),
  estado_regulatorio: z.enum(ESTADOS_REGULATORIOS).optional(),
  firma_metodo: z.string().max(30).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  observaciones: z.string().max(2000).optional().nullable(),
});

/**
 * Cambio de tasa — el trigger inversion_tasa_audit registra
 * automáticamente la transición en inversion_tasa_historial cuando
 * tasa_mensual cambia. Acá agregamos el motivo via update aparte.
 */
export const inversionCambioTasaSchema = z.object({
  id: z.string().uuid(),
  tasa_nueva: nonNegativeDecimal.refine((v) => v <= 99.99, "Tasa fuera de rango"),
  motivo: z.string().min(3, "Motivo requerido (mínimo 3 caracteres)").max(500),
});

export const inversionCambioEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS_INVERSION),
});

export const inversionFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(ESTADOS_INVERSION).optional(),
  tipo_instrumento: z.enum(TIPOS_INSTRUMENTO).optional(),
  estado_regulatorio: z.enum(ESTADOS_REGULATORIOS).optional(),
  inversor_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type InversionCreateInput = z.infer<typeof inversionCreateSchema>;
export type InversionUpdateInput = z.infer<typeof inversionUpdateSchema>;
export type InversionCambioTasaInput = z.infer<typeof inversionCambioTasaSchema>;
export type InversionCambioEstadoInput = z.infer<typeof inversionCambioEstadoSchema>;
export type InversionFilters = z.infer<typeof inversionFiltersSchema>;

export const LABEL_ESTADO: Record<EstadoInversion, string> = {
  activa: "Activa",
  suspendida: "Suspendida",
  finalizada: "Finalizada",
};

export const LABEL_TIPO_INSTRUMENTO: Record<TipoInstrumento, string> = {
  mutuo: "Mutuo simple",
  fideicomiso: "Fideicomiso",
  fci_cnv: "FCI inscripto CNV",
  prestamo_participativo: "Préstamo participativo",
  otro: "Otro",
};

export const LABEL_REGULATORIO: Record<EstadoRegulatorio, string> = {
  pre_dictamen: "Pre-dictamen",
  vigente: "Vigente",
  ajuste_requerido: "Ajuste requerido",
};

export const COLOR_ESTADO: Record<EstadoInversion, string> = {
  activa: "bg-svi-success/15 border-svi-success/30 text-svi-success",
  suspendida: "bg-svi-warning/15 border-svi-warning/30 text-svi-warning",
  finalizada: "bg-svi-elevated/40 border-svi-border-muted text-svi-muted-2",
};

export const COLOR_REGULATORIO: Record<EstadoRegulatorio, string> = {
  pre_dictamen: "bg-svi-warning/15 border-svi-warning/30 text-svi-warning",
  vigente: "bg-svi-success/15 border-svi-success/30 text-svi-success",
  ajuste_requerido: "bg-svi-error/15 border-svi-error/30 text-svi-error",
};
