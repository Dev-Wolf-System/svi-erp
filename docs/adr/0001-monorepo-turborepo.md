# ADR 0001 — Monorepo con Turborepo

**Status:** accepted
**Fecha:** 2026-04-26
**Decididores:** Matías Díaz (PO), Claude (arquitectura)

## Contexto

El proyecto SVI tiene **3 superficies UI** (landing, portal extranet, ERP admin) con un **design system compartido**. Hay también código compartido de tipos de DB, helpers y validaciones.

## Alternativas evaluadas

1. **3 repos independientes** — duplicación de código, design system desincronizado.
2. **Monorepo manual con npm workspaces** — funciona pero sin caché de builds ni task orchestration.
3. **Nx** — potente pero curva de aprendizaje alta y configuración verbosa.
4. **Turborepo** ✅

## Decisión

Turborepo + npm workspaces. Estructura `apps/{web,admin}` + `packages/{ui,database,config,utils}`.

## Rationale

- Build cache local + remoto reduce tiempos de CI a la mitad.
- Task orchestration sencilla (`turbo run build`, `turbo run check-types`).
- Comparte código TypeScript sin necesidad de publicar paquetes.
- Compatible con Vercel deploys separados por app.
- Documentación oficial actualizada y comunidad activa.

## Consecuencias

- Cada package debe declarar sus exports explícitamente en `package.json`.
- Cambios en `packages/*` invalidan caché de las apps que los consumen — esperado.
- Versionado: privado (`"private": true` en cada package interno).
