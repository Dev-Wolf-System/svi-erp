import {
  boolean,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditableColumns, softDeletable } from "./_shared";
import { empresas, sucursales } from "./empresas";

export const roles = pgTable("roles", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  permisos: jsonb("permisos").notNull().default([]),
});

/**
 * `usuarios.id` es == `auth.users.id` de Supabase.
 * El registro se crea por trigger cuando se confirma el email.
 */
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey(), // == auth.users.id
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  telefono: varchar("telefono", { length: 20 }),
  avatarUrl: text("avatar_url"),
  activo: boolean("activo").notNull().default(true),
  ...softDeletable(),
  createdAt: auditableColumns().createdAt,
  updatedAt: auditableColumns().updatedAt,
});

/**
 * Tabla puente: un usuario puede tener distintos roles según la sucursal.
 * Esta es la fuente de los claims `sucursales[]` y `rol` del JWT.
 */
export const usuarioSucursalRol = pgTable(
  "usuario_sucursal_rol",
  {
    ...auditableColumns(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursales.id, { onDelete: "restrict" }),
    rolId: uuid("rol_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    esPrincipal: boolean("es_principal").notNull().default(false),
  },
  (t) => ({
    uniqUserSucursal: unique().on(t.usuarioId, t.sucursalId),
  }),
);

export type Rol = typeof roles.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
export type UsuarioSucursalRol = typeof usuarioSucursalRol.$inferSelect;
