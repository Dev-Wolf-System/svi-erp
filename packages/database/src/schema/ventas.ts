import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  auditableColumns,
  estadoVentaEnum,
  monedaCol,
  softDeletable,
} from "./_shared";
import { empresas, sucursales } from "./empresas";
import { clientes } from "./clientes";
import { vehiculos } from "./vehiculos";
import { usuarios } from "./usuarios";

export const bancos = pgTable("bancos", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  contacto: varchar("contacto", { length: 100 }),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 100 }),
  condiciones: jsonb("condiciones").notNull().default({}),
  activo: boolean("activo").notNull().default(true),
});

/**
 * Ventas — incluye snapshot inmutable de comisión y campos AFIP.
 * Numeración generada con SEQUENCE atómica vía función PG.
 */
export const ventas = pgTable(
  "ventas",
  {
    ...auditableColumns(),
    ...softDeletable(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id, { onDelete: "restrict" }),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursales.id, { onDelete: "restrict" }),
    /** Generado por trigger: SVI-AGU-2026-00001 */
    numeroOperacion: varchar("numero_operacion", { length: 30 }).notNull().unique(),

    vehiculoId: uuid("vehiculo_id")
      .notNull()
      .references(() => vehiculos.id, { onDelete: "restrict" }),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    vendedorId: uuid("vendedor_id").references(() => usuarios.id),

    precioVenta: decimal("precio_venta", { precision: 15, scale: 2 }).notNull(),
    moneda: monedaCol(),
    descuento: decimal("descuento", { precision: 15, scale: 2 }).notNull().default("0"),
    precioFinal: decimal("precio_final", { precision: 15, scale: 2 }).notNull(),

    tipoPago: varchar("tipo_pago", { length: 30 }).notNull(), // contado, financiado, parte_pago

    /** Vehículo recibido como parte de pago (consignación o canje) */
    vehiculoParteId: uuid("vehiculo_parte_id").references(() => vehiculos.id),
    valorParte: decimal("valor_parte", { precision: 15, scale: 2 }),

    /** Financiación bancaria */
    bancoId: uuid("banco_id").references(() => bancos.id),
    legajoBanco: varchar("legajo_banco", { length: 50 }),
    montoFinanciado: decimal("monto_financiado", { precision: 15, scale: 2 }),
    cuotas: integer("cuotas"),
    tasaBanco: decimal("tasa_banco", { precision: 5, scale: 2 }),

    estado: estadoVentaEnum("estado").notNull().default("reserva"),

    /** SNAPSHOT INMUTABLE de comisión — no recalcular si después cambia % */
    comisionPct: decimal("comision_pct", { precision: 5, scale: 2 }),
    comisionMonto: decimal("comision_monto", { precision: 15, scale: 2 }),

    docs: jsonb("docs").notNull().default([]),
    contratoUrl: text("contrato_url"),

    /** Mercado Pago — tracking de la seña */
    mpPreferenceId: text("mp_preference_id"),
    mpPaymentId: text("mp_payment_id"),
    mpStatus: text("mp_status"),

    /** AFIP — completo desde Fase 4 vía AfipStubDriver hasta tener cert real */
    afipDriver: varchar("afip_driver", { length: 20 }), // 'stub' | 'sandbox' | 'production'
    cae: varchar("cae", { length: 20 }),
    caeVencimiento: date("cae_vencimiento"),
    tipoComprobante: varchar("tipo_comprobante", { length: 20 }), // 'A', 'B', 'remito'
    puntoVenta: integer("punto_venta"),
    numeroComprobanteAfip: varchar("numero_comprobante_afip", { length: 30 }),
    comprobanteAfipUrl: text("comprobante_afip_url"),

    notas: text("notas"),
  },
  (t) => ({
    idxCliente: index("idx_ventas_cliente").on(t.clienteId),
    idxSucursalFecha: index("idx_ventas_sucursal_fecha").on(t.sucursalId, t.createdAt),
    idxEstado: index("idx_ventas_estado").on(t.estado),
  }),
);

export type Banco = typeof bancos.$inferSelect;
export type Venta = typeof ventas.$inferSelect;
export type NewVenta = typeof ventas.$inferInsert;
