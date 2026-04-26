import { boolean, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { auditableColumns, softDeletable } from "./_shared";
import { empresas, sucursales } from "./empresas";
import { usuarios } from "./usuarios";
import { vehiculos } from "./vehiculos";

export const clientes = pgTable("clientes", {
  ...auditableColumns(),
  ...softDeletable(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  tipo: varchar("tipo", { length: 20 }).notNull().default("persona"),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }),
  razonSocial: varchar("razon_social", { length: 200 }),
  dni: varchar("dni", { length: 15 }),
  cuit: varchar("cuit", { length: 13 }),
  email: varchar("email", { length: 100 }),
  telefono: varchar("telefono", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  direccion: text("direccion"),
  localidad: varchar("localidad", { length: 100 }),
  provincia: varchar("provincia", { length: 100 }),
  docs: jsonb("docs").notNull().default([]),
  /** Si true, tiene acceso al portal extranet (/portal/cliente) */
  portalActivo: boolean("portal_activo").notNull().default(false),
  /** Link a auth.users.id para el portal */
  portalUserId: uuid("portal_user_id"),
  origen: varchar("origen", { length: 50 }),
  notas: text("notas"),
});

export const leads = pgTable("leads", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  sucursalId: uuid("sucursal_id").references(() => sucursales.id),
  nombre: varchar("nombre", { length: 200 }),
  email: varchar("email", { length: 100 }),
  telefono: varchar("telefono", { length: 20 }),
  mensaje: text("mensaje"),
  estado: varchar("estado", { length: 30 }).notNull().default("nuevo"),
  vehiculoInteres: uuid("vehiculo_interes").references(() => vehiculos.id),
  vendedorId: uuid("vendedor_id").references(() => usuarios.id),
  origen: varchar("origen", { length: 50 }),
});

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
