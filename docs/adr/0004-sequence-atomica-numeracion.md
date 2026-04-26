# ADR 0004 — Numeración con SEQUENCE atómica

**Status:** accepted
**Fecha:** 2026-04-26

## Contexto

Las operaciones (ventas, contratos de inversión, liquidaciones) requieren un número correlativo único por **(empresa, tipo, sucursal, año)**. Formato: `SVI-AGU-2026-00001`.

## Problema con el patrón v2.0

```sql
-- v2.0 — bug crítico de race condition
CREATE FUNCTION generar_numero_operacion(...)
DECLARE v_contador INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_contador FROM audit_log WHERE ...;
  RETURN '...'  || LPAD(v_contador::TEXT, 5, '0');
END;
```

Bajo concurrencia (dos ventas simultáneas en distintas sucursales) → ambas leen el mismo COUNT → mismo número → violación de UNIQUE en `ventas.numero_operacion` o, peor, no hay UNIQUE y se duplica silenciosamente. En sistema financiero esto es **bug crítico**.

## Decisión

Tabla dedicada `numeracion_correlativos` con UNIQUE constraint en `(empresa, tipo, sucursal, año)`. Función usa `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` — operación atómica garantizada por Postgres.

```sql
INSERT INTO numeracion_correlativos (...) VALUES (..., 1)
ON CONFLICT (empresa_id, tipo, codigo_sucursal, anio)
DO UPDATE SET ultimo_numero = numeracion_correlativos.ultimo_numero + 1
RETURNING ultimo_numero;
```

## Rationale

- Postgres garantiza atomicidad del UPSERT con `RETURNING`.
- Sin race conditions incluso con miles de transacciones concurrentes.
- Más rápido que `SELECT COUNT(*)` (no escanea tabla histórica).
- Auditable: `numeracion_correlativos.updated_at` muestra cuándo se generó el último número.

## Alternativas descartadas

- **`SEQUENCE` nativa de PG** — no soporta scope por (sucursal, año) sin crear N sequences dinámicas (frágil).
- **Generación en frontend con UUID + counter** — irrecuperable si el cliente falla, mostrable.
- **Lock pesimista (SELECT FOR UPDATE)** — funciona pero serializa accesos → contention.

## Consecuencias

- La función debe llamarse desde transacción (default en Supabase).
- Si se borra un registro, su número NO se reutiliza (correcto — es trazabilidad).
- Cambio de año reinicia el contador automáticamente.

## Validación

Test pgTAP: 100 inserts concurrentes simulados → 0 duplicados.
