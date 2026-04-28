# ADR 0006 — Adapter pattern para integraciones externas

**Status:** accepted · **Implementado en F4** (AFIP stub + Mercado Pago)
**Fecha:** 2026-04-26

## Contexto

El sistema integra con **muchos** proveedores externos: Mercado Pago, AFIP, Resend, WhatsApp Business, n8n, Anthropic, InfoAuto. Acoplarse directo a sus SDKs hace imposible cambiar de proveedor o testear sin hacer requests reales.

## Decisión

Toda integración externa va detrás de una **interfaz estable** con **drivers intercambiables** vía env var.

Ejemplo AFIP:

```typescript
interface AfipFacturador {
  emitirFactura(venta: Venta): Promise<{ cae: string; vencimiento: Date }>
  consultarCae(cae: string): Promise<EstadoCae>
}

class AfipStubDriver        implements AfipFacturador { /* mock para dev */ }
class AfipSandboxDriver     implements AfipFacturador { /* WSFE testing */ }
class AfipProductionDriver  implements AfipFacturador { /* WSFE prod */ }

// Selección por env
const afip = createAfipDriver(process.env.AFIP_DRIVER) // 'stub' | 'sandbox' | 'production'
```

## Aplica a

| Dominio | Interfaz | Drivers |
|---|---|---|
| Pagos | `PaymentGateway` | MercadoPago, Transferencia, Stripe (futuro) |
| Facturación AR | `AfipFacturador` | Stub, Sandbox, Production |
| Email | `EmailSender` | Resend, Postmark, SMTP |
| WhatsApp | `WhatsAppSender` | Evolution API, Twilio, Meta Cloud API |
| IA | `AiProvider` | Anthropic Claude, OpenAI, Groq |
| Storage | `FileStorage` | Supabase Storage, S3, R2 |

## Rationale

- Cambiar de proveedor = cambiar el driver, no reescribir flujos.
- Tests unitarios usan `StubDriver` — sin requests reales, sin secrets.
- Permite **A/B testing** de proveedores en producción (ej: Resend vs Postmark).
- AFIP se puede desarrollar con `Stub` desde Fase 4 sin tener el certificado real (§13.1 del plan).

## Estructura real (F4)

```
packages/integrations/
  src/
    afip/
      types.ts              # interface AfipFacturador, FacturaPayload, enums
      stub-driver.ts        # CAE simulado de 14 dígitos, validaciones reales
      factory.ts            # getAfipDriver() lee AFIP_DRIVER env
      __tests__/            # 24 tests sobre el stub
      index.ts
    mercadopago/
      types.ts              # CreatePreferenceInput, WebhookEvent, MpPaymentStatus
      client.ts             # singleton MP SDK + buildExternalReference / parse
      create-preference.ts  # creación de Preference con idempotency key
      webhook-validator.ts  # HMAC SHA256 (manifest correcto: id=data.id)
      __tests__/            # 14 tests HMAC + 7 tests external-reference
      index.ts

packages/pdf/                # @repo/pdf — separado de integrations por peso de @react-pdf
  src/
    contrato-venta/
      schema.ts             # Zod
      template.tsx          # JSX para @react-pdf/renderer
      render.tsx            # renderContratoVenta(data): Promise<Buffer>
    fonts.ts                # registerSviFonts (opcional, fallback Helvetica)
    theme.ts                # tokens visuales del PDF
```

## Drivers AFIP planeados

- ✅ **stub** — CAE simulado, sin red, sin certificado. Usado en dev y operación inicial mientras se tramita el cert AFIP. Genera CAEs de 14 dígitos válidos contra todas las validaciones del WSFE excepto la firma real.
- ⏳ **sandbox** — WSFEv1 contra homologación AFIP. Requiere `AFIP_CERT`, `AFIP_KEY`, `AFIP_PUNTO_VENTA`, `AFIP_CUIT`. A implementar cuando se tenga cert de testing.
- ⏳ **production** — WSFEv1 contra ambiente real. Misma interfaz, distintos endpoints.

Cambio de driver = cambiar `AFIP_DRIVER` en `.env`. El código de aplicación
(server actions de `apps/admin/src/modules/ventas/integraciones.ts`) no se entera.

## Drivers Mercado Pago

Único driver real (no hay stub) porque MP **sí** tiene sandbox accesible con
credenciales `TEST-...`. El "switch" es a nivel de credenciales, no de driver.

## Consecuencias

- Más archivos por dominio — vale la pena por la flexibilidad.
- Cada driver debe respetar la interfaz al 100% (TypeScript lo enforce).
- Documentar en cada interfaz qué errores puede lanzar (typed errors).
- Los packages son `private: true` — no se publican a npm, solo se consumen
  por workspace (`workspace:*` en `package.json`).
