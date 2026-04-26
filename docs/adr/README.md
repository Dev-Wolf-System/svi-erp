# Architecture Decision Records (ADR)

Decisiones técnicas relevantes del proyecto SVI. Cada ADR captura **contexto, alternativas evaluadas y rationale** — para que dentro de 6 meses cualquiera entienda por qué se eligió X.

## Convenciones

- Numeración correlativa: `0001-titulo-corto.md`
- Status: `accepted` | `superseded by ADR-XXXX` | `deprecated`
- Inmutables una vez aceptados — los cambios van en un nuevo ADR que supersedea al anterior.

## Índice

| ADR | Título | Status |
|---|---|---|
| [0001](./0001-monorepo-turborepo.md) | Monorepo con Turborepo | accepted |
| [0002](./0002-drizzle-vs-prisma.md) | ORM: Drizzle sobre Prisma | accepted |
| [0003](./0003-jwt-claims-vs-subqueries.md) | RLS con JWT claims, no subqueries | accepted |
| [0004](./0004-sequence-atomica-numeracion.md) | Numeración con SEQUENCE atómica | accepted |
| [0005](./0005-idempotencia-webhooks.md) | Webhooks idempotentes vía tabla dedicada | accepted |
| [0006](./0006-adapter-pattern-integraciones.md) | Adapter pattern para integraciones externas | accepted |
| [0007](./0007-fci-flex-first.md) | Módulo FCI con diseño flex-first | accepted |
