import { z } from "zod";
import { isValidCuit } from "@repo/utils";

const tipoSchema = z.enum(["persona", "empresa"]);

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

export const clienteCreateSchema = z
  .object({
    tipo: tipoSchema.default("persona"),
    nombre: z.string().min(1, "Requerido").max(100),
    apellido: z.string().max(100).optional().nullable(),
    razon_social: z.string().max(200).optional().nullable(),
    dni: dniSchema,
    cuit: cuitSchema,
    email: emailSchema,
    telefono: z.string().max(20).optional().nullable(),
    celular: z.string().max(20).optional().nullable(),
    direccion: z.string().max(500).optional().nullable(),
    localidad: z.string().max(100).optional().nullable(),
    provincia: z.string().max(100).optional().nullable(),
    portal_activo: z.boolean().default(false),
    origen: z.string().max(50).optional().nullable(),
    notas: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (d) => (d.tipo === "empresa" ? !!d.razon_social && !!d.cuit : true),
    { message: "Razón social y CUIT son obligatorios para empresas", path: ["razon_social"] },
  );

export const clienteUpdateSchema = z
  .object({
    id: z.string().uuid(),
    tipo: tipoSchema.optional(),
    nombre: z.string().min(1).max(100).optional(),
    apellido: z.string().max(100).optional().nullable(),
    razon_social: z.string().max(200).optional().nullable(),
    dni: dniSchema,
    cuit: cuitSchema,
    email: emailSchema,
    telefono: z.string().max(20).optional().nullable(),
    celular: z.string().max(20).optional().nullable(),
    direccion: z.string().max(500).optional().nullable(),
    localidad: z.string().max(100).optional().nullable(),
    provincia: z.string().max(100).optional().nullable(),
    portal_activo: z.boolean().optional(),
    origen: z.string().max(50).optional().nullable(),
    notas: z.string().max(2000).optional().nullable(),
  });

export const clienteFiltersSchema = z.object({
  search: z.string().optional(),
  tipo: tipoSchema.optional(),
  provincia: z.string().optional(),
  portal_activo: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
export type ClienteFilters = z.infer<typeof clienteFiltersSchema>;
