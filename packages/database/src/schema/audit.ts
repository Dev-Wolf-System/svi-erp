import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditableColumns } from "./_shared";
import { customType } from "drizzle-orm/pg-core";

const inet = customType<{ data: string }>({
  dataType() {
    return "inet";
  },
});

/** Trazabilidad financiera — quién cambió qué y cuándo */
export const auditLog = pgTable("audit_log", {
  ...auditableColumns(),
  empresaId: uuid("empresa_id"),
  tabla: varchar("tabla", { length: 100 }).notNull(),
  operacion: varchar("operacion", { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
  registroId: uuid("registro_id").notNull(),
  usuarioId: uuid("usuario_id"),
  datosAnteriores: jsonb("datos_anteriores"),
  datosNuevos: jsonb("datos_nuevos"),
  ipAddress: inet("ip_address"),
});

/**
 * Numeración correlativa atómica (reemplaza el COUNT(*) original).
 * Una fila por (empresa, tipo, sucursal, año). UPSERT con RETURNING garantiza atomicidad.
 */
export const numeracionCorrelativos = pgTable(
  "numeracion_correlativos",
  {
    ...auditableColumns(),
    empresaId: uuid("empresa_id").notNull(),
    tipo: varchar("tipo", { length: 30 }).notNull(),
    codigoSucursal: varchar("codigo_sucursal", { length: 10 }).notNull(),
    anio: integer("anio").notNull(),
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
  },
  (t) => ({
    uniq: unique("uniq_numeracion").on(t.empresaId, t.tipo, t.codigoSucursal, t.anio),
  }),
);

/**
 * IDEMPOTENCIA DE WEBHOOKS — clave para MP, AFIP, n8n, Resend.
 * Patrón de uso (Edge Function):
 *   INSERT INTO webhook_eventos (proveedor, external_id, payload)
 *     VALUES ('mercadopago', $1, $2)
 *     ON CONFLICT (proveedor, external_id) DO NOTHING RETURNING id;
 */
export const webhookEventos = pgTable(
  "webhook_eventos",
  {
    ...auditableColumns(),
    proveedor: varchar("proveedor", { length: 30 }).notNull(),
    externalId: varchar("external_id", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    procesado: boolean("procesado").notNull().default(false),
    error: text("error"),
    intentos: integer("intentos").notNull().default(0),
    procesadoAt: timestamp("procesado_at", { withTimezone: true }),
  },
  (t) => ({
    uniq: unique("uniq_webhook").on(t.proveedor, t.externalId),
    idxProcesado: index("idx_webhook_procesado").on(t.procesado),
  }),
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NumeracionCorrelativo = typeof numeracionCorrelativos.$inferSelect;
export type WebhookEvento = typeof webhookEventos.$inferSelect;
