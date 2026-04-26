import { boolean, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { auditableColumns, softDeletable } from "./_shared";

/**
 * Tabla raíz del multi-tenancy. TODA tabla operativa referencia empresas.id.
 * `config` JSONB controla módulos activos, branding, drivers, monedas (ver §3.3.E del plan).
 */
export const empresas = pgTable("empresas", {
  ...auditableColumns(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  razonSocial: varchar("razon_social", { length: 200 }),
  cuit: varchar("cuit", { length: 13 }),
  logoUrl: text("logo_url"),
  config: jsonb("config").$type<EmpresaConfig>().notNull().default({}),
});

export const sucursales = pgTable("sucursales", {
  ...auditableColumns(),
  ...softDeletable(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "restrict" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 10 }).notNull(),
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 100 }),
  tieneCaja: boolean("tiene_caja").notNull().default(true),
  activa: boolean("activa").notNull().default(true),
  config: jsonb("config").notNull().default({}),
});

/** Forma del JSONB `empresas.config` — extensible sin migración */
export interface EmpresaConfig {
  modulos_activos?: string[];
  moneda_default?: "ARS" | "USD";
  monedas_aceptadas?: ("ARS" | "USD")[];
  tasa_fci_default?: number;
  dias_reserva_default?: number;
  afip_driver?: "stub" | "sandbox" | "production";
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
  feature_flags?: Record<string, boolean>;
}

export type Empresa = typeof empresas.$inferSelect;
export type NewEmpresa = typeof empresas.$inferInsert;
export type Sucursal = typeof sucursales.$inferSelect;
export type NewSucursal = typeof sucursales.$inferInsert;
