import { z } from "zod";

/**
 * Schema de los datos necesarios para emitir un Contrato de Venta SVI.
 *
 * Es la fuente de verdad: la query del módulo `ventas` debe devolver este
 * shape antes de invocar `renderContratoVenta()`. Si la query expone otro
 * shape, mapearlo aquí — el template no acepta otra estructura.
 */
export const contratoVentaSchema = z.object({
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
  venta: z.object({
    numero_operacion: z.string().min(1),
    fecha: z.string().min(1), // ISO o YYYY-MM-DD
    moneda: z.enum(["ARS", "USD"]).default("ARS"),
    precio_venta: z.number().nonnegative(),
    descuento: z.number().nonnegative().default(0),
    precio_final: z.number().nonnegative(),
    tipo_pago: z.enum(["contado", "financiado", "parte_pago"]),
    notas: z.string().nullable().optional(),
  }),
  vehiculo: z.object({
    marca: z.string().min(1),
    modelo: z.string().min(1),
    anio: z.number().int().gte(1950).lte(2100),
    dominio: z.string().min(1),
    chasis: z.string().nullable().optional(),
    motor: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    kilometros: z.number().nonnegative().nullable().optional(),
  }),
  cliente: z.object({
    tipo: z.enum(["persona", "empresa"]),
    nombre: z.string().min(1),
    apellido: z.string().nullable().optional(),
    documento_tipo: z.enum(["DNI", "CUIT", "CUIL"]),
    documento_numero: z.string().min(1),
    direccion: z.string().nullable().optional(),
    telefono: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }),
  /** Sólo si tipo_pago === 'parte_pago' */
  parte_pago: z
    .object({
      marca: z.string(),
      modelo: z.string(),
      anio: z.number().int(),
      dominio: z.string(),
      valor: z.number().nonnegative(),
    })
    .nullable()
    .optional(),
  /** Sólo si tipo_pago === 'financiado' */
  financiacion: z
    .object({
      banco_nombre: z.string(),
      legajo: z.string().nullable().optional(),
      monto_financiado: z.number().nonnegative(),
      cuotas: z.number().int().positive(),
      tasa_pct: z.number().nonnegative(),
    })
    .nullable()
    .optional(),
});

export type ContratoVentaData = z.infer<typeof contratoVentaSchema>;
