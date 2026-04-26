# ADR 0007 — Módulo FCI con diseño flex-first

**Status:** accepted
**Fecha:** 2026-04-26

## Contexto

El módulo FCI (Fondo Común de Inversión) es **central para el negocio actual de SVI**. La operatoria legal puede caer bajo distintos regímenes: mutuo simple, fideicomiso, FCI inscripto en CNV, préstamo participativo. **El dictamen legal definitivo se obtendrá después de Fase 5.**

## Decisión del Product Owner

**Desarrollar el módulo igualmente en Fase 5**, con un diseño **"flex-first"** que permita absorber el dictamen legal posterior sin migración destructiva.

## Patrones de flexibilidad aplicados

1. **JSONB extensible** — `inversiones.config` y `inversores.config` aceptan cualquier campo nuevo sin ALTER TABLE.
2. **Discriminadores ENUM extensibles** — `tipo_instrumento` y `estado_regulatorio` cubren los regímenes posibles.
3. **Snapshots inmutables** — cada liquidación congela `capital_base` y `tasa_aplicada` → recalculo nunca cambia historia.
4. **Versionado de tasas** — `inversion_tasa_historial` registra cada cambio.
5. **Templates de contrato parametrizables** — Mustache + storage de templates → cambiar contrato no requiere redeploy.
6. **Cifrado de datos bancarios** — pgsodium en `inversores.cbu` y campos sensibles.
7. **Campo `firma_metodo`** — permite migrar de presencial a digital sin rediseño.
8. **Default operativo: `mutuo` + `pre_dictamen`** — todas las inversiones pre-dictamen quedan marcadas para trazabilidad.

## Rationale

- El negocio no puede esperar al dictamen — los inversores ya operan.
- Bloquear el desarrollo es peor que asumir el riesgo legal con conocimiento explícito.
- Los patrones de flexibilidad asumen costo upfront mínimo (un JSONB acá, una migración aditiva allá) que se paga muchas veces si el dictamen pide cambios.

## Riesgos asumidos conscientemente (Product Owner)

- Operar inversiones sin dictamen previo puede tener implicancias regulatorias.
- **Responsabilidad legal queda con el PO**, no con el sistema técnico.
- Mitigación: trazabilidad completa vía `audit_log` + `estado_regulatorio = 'pre_dictamen'`.

## Plan de adaptación post-dictamen

1. Estudio jurídico emite dictamen.
2. Se crea **migración aditiva** que agrega/modifica campos según el régimen elegido.
3. Se actualiza el **template de contrato** — sin redeploy de código.
4. Se ejecuta **backfill** que setea `estado_regulatorio = 'vigente'` y `tipo_instrumento` correcto en inversiones existentes.
5. Se documenta en nuevo ADR (`0008-fci-dictamen-aplicado.md`).

## Consecuencias

- El equipo legal debe revisar el modelo de contrato base ANTES de la primera firma real (recomendado, no bloqueante).
- Vitest debe garantizar **>90% coverage** en `lib/calculos-fci/` antes de cualquier liquidación real.
- Roadmap de adaptación documentado y monitoreado en el PR del dictamen.
