# ADR 0002 — ORM: Drizzle sobre Prisma

**Status:** accepted
**Fecha:** 2026-04-26

## Contexto

Necesitamos una capa de tipos sobre PostgreSQL (Supabase). Las queries pueden correr en Edge Functions (Deno), Server Components (Node), Vercel Functions y scripts.

## Alternativas evaluadas

1. **Prisma** — el ORM más popular en Node. Mature, gran DX. **Pero**: bundle pesado, requiere generador, soporte parcial en edge runtimes, abstracciones que ocultan SQL.
2. **Drizzle** ✅ — schema en TS plano, queries más cercanas a SQL, edge-friendly, cero generators externos, types nativos PG (incluyendo `tsvector`, `inet`, etc.).
3. **Kysely** — similar a Drizzle pero menos integración con Supabase.
4. **Raw SQL + `postgres` driver** — máximo control, mínimo type safety.

## Decisión

**Drizzle ORM** como fuente de verdad del schema. Ubicado en `packages/database`. Las migraciones se generan con `drizzle-kit generate` y se versionan en `supabase/migrations/` (revisadas a mano).

## Rationale

- Funciona en Deno (Supabase Edge Functions) sin transpilación adicional.
- Soporta tipos PG específicos críticos para el proyecto: `pgsodium`, `tsvector`, `inet`, ENUMs.
- Schema TS = single source of truth → IDE refactoring funciona end-to-end.
- Bundle 10× más chico que Prisma → mejor cold start en serverless.
- Permite raw SQL cuando necesitemos optimizar (Prisma lo dificulta).
- Compatible con Supabase RLS sin sortear nada.

## Consecuencias

- Sin Prisma Studio — usamos Drizzle Studio o pgAdmin.
- Migraciones SQL revisadas manualmente (mejor para sistema financiero).
- Equipo debe aprender la API de Drizzle (curva pequeña, similar a SQL).

## Convivencia con migraciones SQL puras

Para features que requieren SQL avanzado (triggers, hooks de auth, pg_cron, RLS), las migraciones se escriben directo en `supabase/migrations/*.sql` y el schema TS las refleja con `customType` o columnas marcadas con comentarios.
