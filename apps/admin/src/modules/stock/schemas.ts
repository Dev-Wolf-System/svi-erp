import { z } from "zod";

/**
 * Schemas Zod del módulo stock — fuente de verdad para validación.
 * Reflejan el schema PG (vehiculos) sin acoplarse a Drizzle (queries server-side).
 */

const monedaSchema = z.enum(["ARS", "USD"]);
const tipoSchema = z.enum(["auto", "4x4", "camioneta", "moto", "utilitario", "otro"]);
const condicionSchema = z.enum(["0km", "usado"]);
const estadoSchema = z.enum([
  "stock",
  "reservado",
  "vendido",
  "consignacion",
  "preparacion",
  "baja",
]);

const decimal = z.coerce
  .number({ message: "Debe ser un número" })
  .nonnegative("Debe ser positivo");

export const vehiculoCreateSchema = z.object({
  sucursal_id: z.string().uuid("Sucursal inválida"),
  numero_interno: z.string().max(20).optional().nullable(),
  patente: z
    .string()
    .max(15)
    .transform((v) => v.toUpperCase().replace(/\s/g, ""))
    .optional()
    .nullable(),
  vin: z.string().max(17).optional().nullable(),

  tipo: tipoSchema,
  condicion: condicionSchema,
  marca: z.string().min(1, "Requerido").max(50),
  modelo: z.string().min(1, "Requerido").max(100),
  version: z.string().max(100).optional().nullable(),
  anio: z.coerce
    .number({ message: "Año requerido" })
    .int()
    .min(1900, "Año inválido")
    .max(new Date().getFullYear() + 2, "Año futuro inválido"),
  color: z.string().max(50).optional().nullable(),
  kilometraje: z.coerce.number().int().nonnegative().optional().nullable(),
  combustible: z.string().max(30).optional().nullable(),
  transmision: z.string().max(20).optional().nullable(),
  motor: z.string().max(50).optional().nullable(),
  puertas: z.coerce.number().int().min(0).max(10).optional().nullable(),
  equipamiento: z.array(z.string()).default([]),

  precio_compra: decimal.optional().nullable(),
  precio_venta: decimal.refine((n) => n > 0, "El precio de venta es obligatorio"),
  moneda: monedaSchema.default("ARS"),

  estado: estadoSchema.default("stock"),

  fotos: z.array(z.string().url()).default([]),
  foto_principal_url: z.string().url().optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
  historial_service: z.string().max(2000).optional().nullable(),

  es_consignacion: z.boolean().default(false),
  consignante_id: z.string().uuid().optional().nullable(),
});

export const vehiculoUpdateSchema = vehiculoCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const vehiculoFiltersSchema = z.object({
  search: z.string().optional(),
  tipo: tipoSchema.optional(),
  condicion: condicionSchema.optional(),
  estado: estadoSchema.optional(),
  sucursal_id: z.string().uuid().optional(),
  marca: z.string().optional(),
  precio_min: z.coerce.number().nonnegative().optional(),
  precio_max: z.coerce.number().nonnegative().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type VehiculoCreateInput = z.infer<typeof vehiculoCreateSchema>;
export type VehiculoUpdateInput = z.infer<typeof vehiculoUpdateSchema>;
export type VehiculoFilters = z.infer<typeof vehiculoFiltersSchema>;
