import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica el header `x-n8n-secret` contra `N8N_WEBHOOK_SECRET`.
 *
 * - En `NODE_ENV=production` el secret es OBLIGATORIO. Sin var → 500.
 * - En dev sin var, el handler acepta sin firma (facilita pruebas con curl).
 *
 * Devuelve `null` si la auth pasó; un `NextResponse` con error si no.
 */
export function verifyN8nSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.N8N_WEBHOOK_SECRET;
  const provided = req.headers.get("x-n8n-secret") ?? "";

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "N8N_WEBHOOK_SECRET_not_configured" },
        { status: 500 },
      );
    }
    return null;
  }

  if (provided !== expected) {
    return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
  }

  return null;
}
