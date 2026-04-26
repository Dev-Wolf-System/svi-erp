import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  auditableColumns,
  estadoInversionEnum,
  estadoLiquidacionEnum,
  estadoRegulatorioEnum,
  monedaCol,
  softDeletable,
  tipoInstrumentoEnum,
} from "./_shared";
import { empresas, sucursales } from "./empresas";
import { clientes } from "./clientes";

/**
 * MÓDULO FCI — diseño "flex-first" (ver §13.3 del plan).
 * El dictamen legal puede requerir ajustes; los campos `config JSONB`,
 * `tipoInstrumento` y `estadoRegulatorio` permiten absorberlos sin migración destructiva.
 */
export const inversores = pgTable("inversores", {
  ...auditableColumns(),
  ...softDeletable(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  /** Un inversor puede o no ser cliente del concesionario */
  clienteId: uuid("cliente_id").references(() => clientes.id),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  dni: varchar("dni", { length: 15 }),
  cuit: varchar("cuit", { length: 13 }),
  email: varchar("email", { length: 100 }),
  telefono: varchar("telefono", { length: 20 }),
  /** Datos bancarios — se cifran a nivel columna con pgsodium en migration */
  cbu: varchar("cbu", { length: 22 }),
  alias: varchar("alias", { length: 30 }),
  bancoNombre: varchar("banco_nombre", { length: 100 }),
  /** JSONB extensible para clasificación CNV futura, declaraciones juradas, etc. */
  config: jsonb("config").notNull().default({}),
  portalActivo: boolean("portal_activo").notNull().default(false),
  portalUserId: uuid("portal_user_id"),
});

export const inversiones = pgTable("inversiones", {
  ...auditableColumns(),
  ...softDeletable(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  inversorId: uuid("inversor_id")
    .notNull()
    .references(() => inversores.id, { onDelete: "restrict" }),
  sucursalId: uuid("sucursal_id").references(() => sucursales.id),
  numeroContrato: varchar("numero_contrato", { length: 30 }).notNull(),

  capitalInicial: decimal("capital_inicial", { precision: 15, scale: 2 }).notNull(),
  capitalActual: decimal("capital_actual", { precision: 15, scale: 2 }).notNull(),
  moneda: monedaCol(),
  tasaMensual: decimal("tasa_mensual", { precision: 5, scale: 2 }).notNull(),

  fechaInicio: date("fecha_inicio").notNull(),
  fechaVencimiento: date("fecha_vencimiento"),

  estado: estadoInversionEnum("estado").notNull().default("activa"),

  /** Discriminador del tipo de instrumento — default mutuo simple */
  tipoInstrumento: tipoInstrumentoEnum("tipo_instrumento").notNull().default("mutuo"),
  /** Marca el contexto regulatorio bajo el que se firmó el contrato */
  estadoRegulatorio: estadoRegulatorioEnum("estado_regulatorio")
    .notNull()
    .default("pre_dictamen"),
  /** Método de firma: presencial, digital_afip, tokensign, etc. */
  firmaMetodo: varchar("firma_metodo", { length: 30 }).notNull().default("presencial"),

  /** Bolsa extensible: requiere_inversor_calificado, plazo_minimo_dias, prospecto_url, custodia_id, clausula_penal_pct, etc. */
  config: jsonb("config").notNull().default({}),

  contratoUrl: text("contrato_url"),
  observaciones: text("observaciones"),
});

/** Histórico de cambios de tasa — nunca perdemos el rastro */
export const inversionTasaHistorial = pgTable("inversion_tasa_historial", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  inversionId: uuid("inversion_id")
    .notNull()
    .references(() => inversiones.id, { onDelete: "cascade" }),
  tasaAnterior: decimal("tasa_anterior", { precision: 5, scale: 2 }),
  tasaNueva: decimal("tasa_nueva", { precision: 5, scale: 2 }).notNull(),
  vigenteDesde: date("vigente_desde").notNull(),
  motivo: text("motivo"),
});

/**
 * Liquidaciones — snapshot inmutable del cálculo en el momento.
 * NUNCA recalcular después: capital_base/tasa_aplicada quedan congelados.
 */
export const liquidacionesInversion = pgTable("liquidaciones_inversion", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  inversionId: uuid("inversion_id")
    .notNull()
    .references(() => inversiones.id, { onDelete: "restrict" }),
  periodo: date("periodo").notNull(),
  capitalBase: decimal("capital_base", { precision: 15, scale: 2 }).notNull(),
  tasaAplicada: decimal("tasa_aplicada", { precision: 5, scale: 2 }).notNull(),
  montoInteres: decimal("monto_interes", { precision: 15, scale: 2 }).notNull(),
  moneda: monedaCol(),
  estado: estadoLiquidacionEnum("estado").notNull().default("pendiente"),
  fechaPago: timestamp("fecha_pago", { withTimezone: true }),
  metodoPago: varchar("metodo_pago", { length: 50 }),
  comprobanteUrl: text("comprobante_url"),
  /** Para idempotencia con cron job y eventos n8n */
  externalRef: varchar("external_ref", { length: 100 }).unique(),
});

export type Inversor = typeof inversores.$inferSelect;
export type NewInversor = typeof inversores.$inferInsert;
export type Inversion = typeof inversiones.$inferSelect;
export type NewInversion = typeof inversiones.$inferInsert;
export type LiquidacionInversion = typeof liquidacionesInversion.$inferSelect;
