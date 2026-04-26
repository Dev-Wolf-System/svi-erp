import { sql } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import {
  auditableColumns,
  condicionVehiculoEnum,
  estadoVehiculoEnum,
  monedaCol,
  softDeletable,
  tipoVehiculoEnum,
} from "./_shared";
import { empresas, sucursales } from "./empresas";
import { usuarios } from "./usuarios";

/**
 * Núcleo de stock. Notar:
 *  - `reservadoHasta` + `reservadoPorClienteId` → reservas con expiración (pg_cron las libera).
 *  - `searchVector` lo agrega la migración SQL como columna generada (tsvector).
 *  - Cambios de `precioVenta` se registran automáticamente en vehiculo_precio_historial vía trigger.
 */
export const vehiculos = pgTable(
  "vehiculos",
  {
    ...auditableColumns(),
    ...softDeletable(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id, { onDelete: "restrict" }),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursales.id, { onDelete: "restrict" }),

    numeroInterno: varchar("numero_interno", { length: 20 }),
    patente: varchar("patente", { length: 15 }).unique(),
    vin: varchar("vin", { length: 17 }),

    tipo: tipoVehiculoEnum("tipo").notNull(),
    condicion: condicionVehiculoEnum("condicion").notNull(),
    marca: varchar("marca", { length: 50 }).notNull(),
    modelo: varchar("modelo", { length: 100 }).notNull(),
    version: varchar("version", { length: 100 }),
    anio: integer("anio").notNull(),
    color: varchar("color", { length: 50 }),
    kilometraje: integer("kilometraje"),
    combustible: varchar("combustible", { length: 30 }),
    transmision: varchar("transmision", { length: 20 }),
    motor: varchar("motor", { length: 50 }),
    puertas: integer("puertas"),
    equipamiento: jsonb("equipamiento").notNull().default([]),

    precioCompra: decimal("precio_compra", { precision: 15, scale: 2 }),
    precioVenta: decimal("precio_venta", { precision: 15, scale: 2 }).notNull(),
    moneda: monedaCol(),

    estado: estadoVehiculoEnum("estado").notNull().default("stock"),
    reservadoHasta: timestamp("reservado_hasta", { withTimezone: true }),
    reservadoPorClienteId: uuid("reservado_por_cliente_id"),

    fotos: jsonb("fotos").notNull().default([]),
    fotoPrincipalUrl: text("foto_principal_url"),
    observaciones: text("observaciones"),
    historialService: text("historial_service"),

    esConsignacion: boolean("es_consignacion").notNull().default(false),
    consignanteId: uuid("consignante_id"),
    ingresadoPor: uuid("ingresado_por").references(() => usuarios.id),
  },
  (t) => ({
    idxSucursal: index("idx_vehiculos_sucursal").on(t.sucursalId),
    idxEstado: index("idx_vehiculos_estado").on(t.estado),
    idxMarcaModelo: index("idx_vehiculos_marca_modelo").on(t.marca, t.modelo),
    idxEmpresa: index("idx_vehiculos_empresa").on(t.empresaId),
  }),
);

/** Histórico de precios — trigger automático al actualizar vehiculos.precio_venta */
export const vehiculoPrecioHistorial = pgTable("vehiculo_precio_historial", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  vehiculoId: uuid("vehiculo_id")
    .notNull()
    .references(() => vehiculos.id, { onDelete: "cascade" }),
  precioAnterior: decimal("precio_anterior", { precision: 15, scale: 2 }),
  precioNuevo: decimal("precio_nuevo", { precision: 15, scale: 2 }).notNull(),
  moneda: monedaCol(),
  motivo: text("motivo"),
  cambiadoPor: uuid("cambiado_por").references(() => usuarios.id),
});

/** Traslados entre sucursales con hoja de ruta */
export const traslados = pgTable("traslados", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  vehiculoId: uuid("vehiculo_id")
    .notNull()
    .references(() => vehiculos.id, { onDelete: "restrict" }),
  sucursalOrigenId: uuid("sucursal_origen_id")
    .notNull()
    .references(() => sucursales.id),
  sucursalDestinoId: uuid("sucursal_destino_id")
    .notNull()
    .references(() => sucursales.id),
  motivo: text("motivo"),
  estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
  solicitadoPor: uuid("solicitado_por").references(() => usuarios.id),
  confirmadoPor: uuid("confirmado_por").references(() => usuarios.id),
  fechaSolicitud: timestamp("fecha_solicitud", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  fechaConfirmacion: timestamp("fecha_confirmacion", { withTimezone: true }),
});

export type Vehiculo = typeof vehiculos.$inferSelect;
export type NewVehiculo = typeof vehiculos.$inferInsert;
export type VehiculoPrecioHistorial = typeof vehiculoPrecioHistorial.$inferSelect;
export type Traslado = typeof traslados.$inferSelect;
