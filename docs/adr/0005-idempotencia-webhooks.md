# ADR 0005 — Webhooks idempotentes vía tabla dedicada

**Status:** accepted
**Fecha:** 2026-04-26

## Contexto

Mercado Pago reintenta webhooks hasta **6 veces** si no recibe `200 OK` rápido. AFIP también reintenta. n8n puede disparar el mismo workflow ante errores de red. Sin idempotencia → doble cobro registrado, doble factura emitida, doble movimiento de caja.

## Decisión

Tabla `webhook_eventos` con UNIQUE constraint en `(proveedor, external_id)`. Cada Edge Function que recibe un webhook ejecuta:

```sql
INSERT INTO webhook_eventos (proveedor, external_id, payload)
  VALUES ('mercadopago', $1, $2)
  ON CONFLICT (proveedor, external_id) DO NOTHING
  RETURNING id;
```

- Si **RETURNING devuelve filas** → es nuevo, procesar.
- Si **no devuelve filas** → ya procesado, retornar `200 OK` y skip.

## Rationale

- Postgres garantiza atomicidad del UPSERT.
- Sin necesidad de Redis/cola externa para dedupe.
- Audit trail: cada webhook recibido queda registrado con su payload.
- Si el procesamiento falla, `intentos` y `error` permiten reintentar manualmente.

## Aplica a

- **Mercado Pago** — `payment.updated`, `merchant_order.updated`
- **AFIP** — confirmación de CAE
- **n8n** — eventos de workflows (liquidación, alertas)
- **Resend** — webhooks de bounce/complaint

## Consecuencias

- Toda Edge Function de webhook debe pasar por este patrón antes de tocar otras tablas.
- `webhook_eventos.payload` puede crecer — se purga con cron job mensual archivando >90 días.
- Tests MSW deben simular reintentos para validar idempotencia.
