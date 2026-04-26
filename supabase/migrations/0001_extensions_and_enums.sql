-- ============================================================================
-- 0001 — Extensiones y ENUMs base
-- ============================================================================
-- Fundación del schema. Debe correr antes que cualquier otra migración.
-- Extensiones: pg_trgm para LIKE rápido, pgsodium para cifrado columnas,
-- pg_cron para liberación de reservas + liquidaciones FCI mensuales.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- búsqueda full-text + similitud
CREATE EXTENSION IF NOT EXISTS "pgsodium";        -- cifrado columnas sensibles
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA pg_catalog;  -- jobs programados

-- ============================================
-- ENUMs (sincronizados con packages/database/src/schema/_shared.ts)
-- ============================================
CREATE TYPE tipo_vehiculo AS ENUM (
  'auto', '4x4', 'camioneta', 'moto', 'utilitario', 'otro'
);

CREATE TYPE condicion_vehiculo AS ENUM ('0km', 'usado');

CREATE TYPE estado_vehiculo AS ENUM (
  'stock', 'reservado', 'vendido', 'consignacion', 'preparacion', 'baja'
);

CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');

CREATE TYPE estado_venta AS ENUM (
  'reserva', 'documentacion', 'aprobado', 'entregado', 'finalizado', 'anulado'
);

CREATE TYPE estado_inversion AS ENUM ('activa', 'suspendida', 'finalizada');

CREATE TYPE estado_liquidacion AS ENUM ('pendiente', 'pagada', 'anulada');

-- Tipo de instrumento financiero — flexible para post-dictamen FCI (ver §13.3)
CREATE TYPE tipo_instrumento AS ENUM (
  'mutuo', 'fideicomiso', 'fci_cnv', 'prestamo_participativo', 'otro'
);

CREATE TYPE estado_regulatorio AS ENUM (
  'pre_dictamen', 'vigente', 'ajuste_requerido'
);
