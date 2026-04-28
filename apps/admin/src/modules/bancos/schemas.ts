import { z } from "zod";

const emailSchema = z
  .string()
  .email("Email inválido")
  .optional()
  .nullable()
  .or(z.literal(""));

/**
 * Estructura del JSONB `condiciones`. El campo es deliberadamente flexible
 * para que cada banco/empresa pueda guardar lo que le sirva al vendedor.
 * Las primeras 6 columnas son las que el wizard de venta consume al
 * sugerir la tasa, así que tipamos lo que sabemos.
 */
export const bancoCondicionesSchema = z
  .object({
    tasa_min: z.coerce.number().nonnegative().nullable().optional(),
    tasa_max: z.coerce.number().nonnegative().nullable().optional(),
    cuotas_min: z.coerce.number().int().positive().nullable().optional(),
    cuotas_max: z.coerce.number().int().positive().nullable().optional(),
    monto_max: z.coerce.number().nonnegative().nullable().optional(),
    requisitos: z.string().max(2000).nullable().optional(),
  })
  .default({});

export const bancoCreateSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(100),
  contacto: z.string().max(100).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: emailSchema,
  condiciones: bancoCondicionesSchema,
  activo: z.boolean().default(true),
});

export const bancoUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(100).optional(),
  contacto: z.string().max(100).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: emailSchema,
  condiciones: bancoCondicionesSchema.optional(),
  activo: z.boolean().optional(),
});

export const bancoFiltersSchema = z.object({
  search: z.string().optional(),
  activo: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type BancoCreateInput = z.infer<typeof bancoCreateSchema>;
export type BancoUpdateInput = z.infer<typeof bancoUpdateSchema>;
export type BancoFilters = z.infer<typeof bancoFiltersSchema>;
export type BancoCondiciones = z.infer<typeof bancoCondicionesSchema>;
