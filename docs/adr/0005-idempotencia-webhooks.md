# ADR 0005 — Webhooks idempotentes vía tabla dedicada

**Status:** accepted · **Implementado en F4.5** (2026-04-28)
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

## Implementación de referencia (F4.5)

El primer webhook real (Mercado Pago) está en
`apps/admin/src/app/api/webhooks/mercadopago/route.ts` y aplica este patrón
con dos diferencias prácticas frente al esquema teórico:

1. **Implementado como Next.js Route Handler (Node runtime)**, no como Supabase
   Edge Function — `crypto.timingSafeEqual` no corre en Deno Edge y la verificación
   HMAC es crítica. La decisión queda abierta a migrar a Edge si surge un caso
   donde tenga sentido (no es el caso de MP).

2. **`INSERT ... .select("id").single()` en lugar de `ON CONFLICT DO NOTHING`** —
   `supabase-js` no expone `RETURNING` con `ON CONFLICT` de forma directa, así que
   el código intenta el INSERT y atrapa el error con `code === "23505"` (unique
   violation) para devolver `200 {deduplicated:true}`. Mismo resultado, distinto
   wire format. La constraint UNIQUE sigue siendo la fuente de verdad.

Documentación operativa del flujo completo en `supabase/SETUP.md` §13.
