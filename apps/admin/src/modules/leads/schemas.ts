import { z } from "zod";

export const LEAD_ESTADOS = [
  "nuevo",
  "contactado",
  "calificado",
  "oportunidad",
  "ganado",
  "perdido",
] as const;

export type LeadEstado = (typeof LEAD_ESTADOS)[number];

export const leadEstadoSchema = z.enum(LEAD_ESTADOS);

export const ESTADO_LABELS: Record<LeadEstado, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  oportunidad: "Oportunidad",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const leadCreateSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(200),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  telefono: z.string().max(20).optional().nullable(),
  mensaje: z.string().max(2000).optional().nullable(),
  estado: leadEstadoSchema.default("nuevo"),
  vehiculo_interes: z.string().uuid().optional().nullable(),
  vendedor_id: z.string().uuid().optional().nullable(),
  sucursal_id: z.string().uuid().optional().nullable(),
  origen: z.string().max(50).optional().nullable(),
});

export const leadUpdateEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: leadEstadoSchema,
});

export const leadAsignarSchema = z.object({
  id: z.string().uuid(),
  vendedor_id: z.string().uuid().nullable(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateEstadoInput = z.infer<typeof leadUpdateEstadoSchema>;
export type LeadAsignarInput = z.infer<typeof leadAsignarSchema>;
