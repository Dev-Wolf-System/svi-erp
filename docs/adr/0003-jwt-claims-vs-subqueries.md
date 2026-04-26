# ADR 0003 — RLS con JWT claims, no subqueries

**Status:** accepted
**Fecha:** 2026-04-26

## Contexto

El sistema es **multi-tenant** y **multi-sucursal**. Cada query debe filtrar automáticamente por `empresa_id` y, opcionalmente, por sucursales asignadas al usuario.

## Problema con el patrón "subquery en RLS" (v2.0 del plan)

```sql
-- v2.0: cada SELECT a vehiculos hace una subquery a usuarios
CREATE POLICY ... USING (
  empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);
```

Con un listado de 1000 vehículos, esto puede generar 1000 subqueries internas (Postgres a veces las cachea, a veces no — depende del plan). Con 30 concesionarias × miles de vehículos, las RLS se convierten en el bottleneck #1.

## Decisión

Inyectar `empresa_id`, `rol` y `sucursales[]` como **claims en el JWT** mediante el hook `custom_access_token_hook` de Supabase Auth. Las RLS leen `auth.jwt() -> 'app_metadata' ->> 'empresa_id'` — operación O(1) sin tocar tablas.

## Rationale

- **Performance ×10** demostrable en EXPLAIN ANALYZE.
- Lookup ocurre una sola vez al login, no en cada query.
- Si el usuario cambia de empresa o se le asignan nuevas sucursales, debe re-loguearse (refresh token). Para SVI no es un problema porque los usuarios no cambian de empresa.
- Compatible con tokens de larga duración y middleware de Next.js.

## Implementación

- Migración `0003_jwt_claims_hook.sql` define el hook.
- Helpers: `auth.empresa_id()`, `auth.rol()`, `auth.sucursales()`, `auth.es_admin()`.
- Tipo TS: `SviAppMetadata` en `@repo/utils/auth/jwt`.

## Consecuencias

- Cuando se asignan nuevas sucursales a un usuario, debe refrescar la sesión para ver el cambio.
- El hook debe estar habilitado en Supabase Cloud (Auth → Hooks).
- Tests pgTAP obligatorios para validar que cada policy bloquea correctamente accesos cross-tenant.
