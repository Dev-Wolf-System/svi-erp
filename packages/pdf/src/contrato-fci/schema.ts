import { z } from "zod";

/**
 * Schema de los datos necesarios para emitir un Contrato FCI SVI.
 *
 * El término "FCI" acá es el término coloquial del PO — el documento
 * formaliza un mutuo / fideicomiso / FCI según el `tipo_instrumento`.
 * El template adapta el lenguaje legal según ese discriminador (ADR 0007
 * flex-first).
 */
export const contratoFciSchema = z.object({
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
  inversion: z.object({
    numero_contrato: z.string().min(1),
    fecha_inicio: z.string().min(1), // YYYY-MM-DD
    fecha_vencimiento: z.string().nullable().optional(),
    moneda: z.enum(["ARS", "USD"]).default("ARS"),
    capital_inicial: z.number().positive(),
    tasa_mensual_pct: z.number().nonnegative(),
    tipo_instrumento: z.enum([
      "mutuo",
      "fideicomiso",
      "fci_cnv",
      "prestamo_participativo",
      "otro",
    ]),
    estado_regulatorio: z.enum([
      "pre_dictamen",
      "vigente",
      "ajuste_requerido",
    ]),
    firma_metodo: z.string(),
    observaciones: z.string().nullable().optional(),
  }),
  inversor: z.object({
    nombre: z.string().min(1),
    documento_tipo: z.enum(["DNI", "CUIT", "CUIL"]),
    documento_numero: z.string().min(1),
    email: z.string().nullable().optional(),
    telefono: z.string().nullable().optional(),
    /** Banco — informativo para el contrato; el CBU NO se imprime entero por seguridad. */
    banco_nombre: z.string().nullable().optional(),
    cbu_ultimos4: z.string().nullable().optional(),
  }),
});

export type ContratoFciData = z.infer<typeof contratoFciSchema>;
