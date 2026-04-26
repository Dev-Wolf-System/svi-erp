# ADR 0006 — Adapter pattern para integraciones externas

**Status:** accepted
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

## Estructura

```
packages/integrations/
  src/
    payments/
      types.ts              # interface PaymentGateway
      mercadopago.ts        # implementación MP
      transferencia.ts      # fallback manual
      index.ts              # factory
    afip/
      types.ts
      stub.ts
      sandbox.ts
      production.ts
      index.ts
    email/
      ...
```

## Consecuencias

- Más archivos por dominio — vale la pena por la flexibilidad.
- Cada driver debe respetar la interfaz al 100% (TypeScript lo enforce).
- Documentar en cada interfaz qué errores puede lanzar (typed errors).
