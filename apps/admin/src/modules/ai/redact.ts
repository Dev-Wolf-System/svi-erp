import "server-only";

/**
 * Sanitiza texto antes de enviarlo a OpenAI.
 *
 * Reemplaza patrones de PII con placeholders genéricos:
 *   - DNI (7-8 dígitos)        → [DNI]
 *   - CUIT/CUIL (XX-XXXXXXXX-X) → [CUIT]
 *   - CBU (22 dígitos)          → [CBU]
 *   - Tarjetas (16 dígitos)     → [TARJETA]
 *   - Emails                    → [EMAIL]
 *   - Teléfonos AR              → [TEL]
 *
 * NO sanitiza nombres, montos ni conceptos — eso es contexto de negocio
 * útil para la IA y no es PII estricto.
 */
export function redactPII(input: string): string {
  if (!input) return input;
  let s = input;

  // CUIT/CUIL — debe ir antes que DNI para no chocar
  s = s.replace(/\b\d{2}-?\d{8}-?\d\b/g, "[CUIT]");

  // CBU
  s = s.replace(/\b\d{22}\b/g, "[CBU]");

  // Tarjetas (16 dígitos con o sin separador)
  s = s.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[TARJETA]");

  // Emails
  s = s.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]");

  // Teléfonos AR (con o sin código país)
  s = s.replace(/\b(?:\+?54\s?)?(?:9\s?)?(?:\d{2,4}[\s-]?)?\d{4}[\s-]?\d{4}\b/g, "[TEL]");

  // DNI (7-8 dígitos al final)
  s = s.replace(/\b\d{7,8}\b/g, "[DNI]");

  return s;
}

/** Sanitiza un objeto recursivamente (sólo strings). */
export function redactObject<T>(obj: T): T {
  if (typeof obj === "string") return redactPII(obj) as T;
  if (Array.isArray(obj)) return obj.map(redactObject) as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactObject(v);
    }
    return out as T;
  }
  return obj;
}
