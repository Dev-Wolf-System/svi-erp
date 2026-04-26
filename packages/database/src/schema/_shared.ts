import { pgEnum, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Columnas convencionales reutilizables.
 * Toda tabla debe usar `auditableColumns()` salvo justificación documentada.
 */
export const auditableColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const softDeletable = () => ({
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/* ============================================
   ENUMs PostgreSQL — sincronizados con constants.ts
   ============================================ */
export const tipoVehiculoEnum = pgEnum("tipo_vehiculo", [
  "auto",
  "4x4",
  "camioneta",
  "moto",
  "utilitario",
  "otro",
]);

export const condicionVehiculoEnum = pgEnum("condicion_vehiculo", ["0km", "usado"]);

export const estadoVehiculoEnum = pgEnum("estado_vehiculo", [
  "stock",
  "reservado",
  "vendido",
  "consignacion",
  "preparacion",
  "baja",
]);

export const tipoMovimientoEnum = pgEnum("tipo_movimiento", ["ingreso", "egreso"]);

export const estadoVentaEnum = pgEnum("estado_venta", [
  "reserva",
  "documentacion",
  "aprobado",
  "entregado",
  "finalizado",
  "anulado",
]);

export const estadoInversionEnum = pgEnum("estado_inversion", [
  "activa",
  "suspendida",
  "finalizada",
]);

export const estadoLiquidacionEnum = pgEnum("estado_liquidacion", [
  "pendiente",
  "pagada",
  "anulada",
]);

/** Tipo de instrumento del módulo FCI — flexible para post-dictamen legal */
export const tipoInstrumentoEnum = pgEnum("tipo_instrumento", [
  "mutuo",
  "fideicomiso",
  "fci_cnv",
  "prestamo_participativo",
  "otro",
]);

export const estadoRegulatorioEnum = pgEnum("estado_regulatorio", [
  "pre_dictamen",
  "vigente",
  "ajuste_requerido",
]);

export const monedaCol = (name = "moneda") =>
  varchar(name, { length: 3 }).notNull().default("ARS");
