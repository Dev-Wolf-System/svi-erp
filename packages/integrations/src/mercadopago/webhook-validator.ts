import crypto from "node:crypto";

/**
 * Verifica la firma HMAC-SHA256 del webhook MP.
 *
 * MP arma el manifest así:
 *   id:[data.id];request-id:[x-request-id];ts:[ts];
 *        ^^^^^^^^^^
 * IMPORTANTE: el primer `id` es el `data.id` del payload (payment_id), NO el x-request-id.
 * Confundirlos hace que TODAS las firmas fallen en producción (la skill original tenía este bug).
 *
 * @param dataId    payment_id real, leído de `payload.data.id`
 * @param requestId valor del header `x-request-id`
 * @param signature header `x-signature` completo (formato: `ts=...,v1=...`)
 * @param secret    `MP_WEBHOOK_SECRET` configurado en el dashboard de MP
 */
export function verifyMpSignature(
  dataId: string,
  requestId: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !dataId || !secret) return false;

  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    acc[k] = v;
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  // Comparación de tiempo constante para evitar timing attacks
  return safeCompareHex(v1, expected);
}

function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Genera el header x-signature válido — útil para tests */
export function signMpManifest(
  dataId: string,
  requestId: string,
  ts: string,
  secret: string,
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}
