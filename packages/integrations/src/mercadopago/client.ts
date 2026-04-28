import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

let cached: { config: MercadoPagoConfig; payment: Payment; preference: Preference } | null = null;

/**
 * Cliente MP — singleton por proceso.
 *
 * IMPORTANTE: NO setear `idempotencyKey` en `options` (se aplicaría a TODAS las
 * llamadas y se invalidaría con cada `Date.now()`). Pasarla por operación en
 * `requestOptions: { idempotencyKey }` desde createPreference / etc.
 */
export function getMpClient(): {
  config: MercadoPagoConfig;
  payment: Payment;
  preference: Preference;
} {
  if (cached) return cached;

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "MP_ACCESS_TOKEN no configurado. Definirlo en .env.local antes de usar MP.",
    );
  }

  const config = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 5000 },
  });

  cached = {
    config,
    payment: new Payment(config),
    preference: new Preference(config),
  };

  return cached;
}

/** Reset para tests */
export function __resetMpClient(): void {
  cached = null;
}

/** Construye external_reference uniforme para routing del webhook */
export function buildExternalReference(
  tipo: string,
  sucursalId: string,
  referenciaId: string,
): string {
  return `${tipo}:${sucursalId}:${referenciaId}`;
}

/** Inverso de buildExternalReference */
export function parseExternalReference(ref: string): {
  tipo: string;
  sucursal_id: string;
  referencia_id: string;
} | null {
  const parts = ref.split(":");
  if (parts.length !== 3) return null;
  const [tipo, sucursal_id, referencia_id] = parts as [string, string, string];
  return { tipo, sucursal_id, referencia_id };
}
