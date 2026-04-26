import { sql } from "drizzle-orm";
import {
  date,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  auditableColumns,
  monedaCol,
  softDeletable,
  tipoMovimientoEnum,
} from "./_shared";
import { empresas, sucursales } from "./empresas";
import { usuarios } from "./usuarios";

export const movimientosCaja = pgTable(
  "movimientos_caja",
  {
    ...auditableColumns(),
    ...softDeletable(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id, { onDelete: "restrict" }),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursales.id, { onDelete: "restrict" }),
    tipo: tipoMovimientoEnum("tipo").notNull(),
    /** Categorías predefinidas — venta_contado, venta_financiada, inversion_capital, liquidacion_inversion, gasto_operativo, etc. */
    categoria: varchar("categoria", { length: 50 }).notNull(),
    concepto: text("concepto").notNull(),
    monto: decimal("monto", { precision: 15, scale: 2 }).notNull(),
    moneda: monedaCol(),
    /** Referencia polimórfica a la entidad que generó el movimiento */
    refTipo: varchar("ref_tipo", { length: 30 }),
    refId: uuid("ref_id"),
    registradoPor: uuid("registrado_por").references(() => usuarios.id),
    fechaOperacion: timestamp("fecha_operacion", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    comprobanteUrl: text("comprobante_url"),
    mpPaymentId: text("mp_payment_id"),
    cierreId: uuid("cierre_id"),
  },
  (t) => ({
    idxSucursalFecha: index("idx_movimientos_caja_sucursal_fecha").on(
      t.sucursalId,
      t.fechaOperacion,
    ),
    idxRef: index("idx_movimientos_caja_ref").on(t.refTipo, t.refId),
  }),
);

export const cierresCaja = pgTable("cierres_caja", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  sucursalId: uuid("sucursal_id")
    .notNull()
    .references(() => sucursales.id, { onDelete: "restrict" }),
  fecha: date("fecha").notNull(),
  totalIngresos: decimal("total_ingresos", { precision: 15, scale: 2 }).notNull(),
  totalEgresos: decimal("total_egresos", { precision: 15, scale: 2 }).notNull(),
  saldo: decimal("saldo", { precision: 15, scale: 2 }).notNull(),
  cerradoPor: uuid("cerrado_por").references(() => usuarios.id),
  observaciones: text("observaciones"),
});

export type MovimientoCaja = typeof movimientosCaja.$inferSelect;
export type NewMovimientoCaja = typeof movimientosCaja.$inferInsert;
export type CierreCaja = typeof cierresCaja.$inferSelect;
