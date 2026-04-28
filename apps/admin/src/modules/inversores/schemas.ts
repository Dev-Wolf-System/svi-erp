import { z } from "zod";
import { isValidCuit } from "@repo/utils";

const dniSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || (v.length >= 7 && v.length <= 8), "DNI inválido (7 u 8 dígitos)")
  .optional()
  .nullable();

const cuitSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || isValidCuit(v), "CUIT inválido (revisar dígito verificador)")
  .optional()
  .nullable();

const emailSchema = z
  .string()
  .email("Email inválido")
  .optional()
  .nullable()
  .or(z.literal(""));

const cbuSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 22, "CBU debe tener 22 dígitos")
  .optional()
  .nullable();

const aliasSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine(
    (v) => v === "" || (v.length >= 6 && v.length <= 30 && /^[a-z0-9._-]+$/i.test(v)),
    "Alias inválido (6-30 caracteres, letras/números/punto/guión)",
  )
  .optional()
  .nullable();

export const inversorCreateSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(200),
  cliente_id: z.string().uuid().optional().nullable(),
  dni: dniSchema,
  cuit: cuitSchema,
  email: emailSchema,
  telefono: z.string().max(20).optional().nullable(),

  // Datos bancarios — sensibles. Cifrado pgsodium pendiente (ver PRODUCTION_HARDENING.md §13).
  cbu: cbuSchema,
  alias: aliasSchema,
  banco_nombre: z.string().max(100).optional().nullable(),

  portal_activo: z.boolean().default(false),

  // JSONB extensible — clasificaciones CNV futuras, declaraciones juradas, etc.
  config: z.record(z.string(), z.unknown()).default({}),

  notas: z.string().max(2000).optional().nullable(),
});

export const inversorUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(200).optional(),
  cliente_id: z.string().uuid().optional().nullable(),
  dni: dniSchema,
  cuit: cuitSchema,
  email: emailSchema,
  telefono: z.string().max(20).optional().nullable(),
  cbu: cbuSchema,
  alias: aliasSchema,
  banco_nombre: z.string().max(100).optional().nullable(),
  portal_activo: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  notas: z.string().max(2000).optional().nullable(),
});

export const inversorFiltersSchema = z.object({
  search: z.string().optional(),
  portal_activo: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type InversorCreateInput = z.infer<typeof inversorCreateSchema>;
export type InversorUpdateInput = z.infer<typeof inversorUpdateSchema>;
export type InversorFilters = z.infer<typeof inversorFiltersSchema>;
