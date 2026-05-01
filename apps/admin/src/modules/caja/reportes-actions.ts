"use server";

import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { chatCompletion, type ModelTier } from "@/modules/ai/client";
import { logTokenUsage, isOverBudget } from "@/modules/ai/audit";
import { redactObject } from "@/modules/ai/redact";
import { checkRateLimit } from "@/modules/ai/rate-limit";

// ─── Tipos compartidos ───────────────────────────────────────────────────────

export type ReporteHighlight = { label: string; value: string };

export type ReporteResult =
  | { ok: true; data: { narrative: string; highlights: ReporteHighlight[] } }
  | { ok: false; error: string };

// ─── Action: narrativa IA ────────────────────────────────────────────────────

export async function generarNarrativaReporte(input: {
  reportType: "arqueo_diario" | "cierre_mensual" | "comparativa_mensual";
  period:     { from: string; to: string };
  data:       unknown;
}): Promise<ReporteResult> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("ia.report", claims.rol)) {
    return { ok: false, error: "Sin permisos para generar reportes IA" };
  }

  // Hard stop por presupuesto mensual
  try {
    if (await isOverBudget(claims.empresa_id)) {
      return { ok: false, error: "Presupuesto mensual de IA agotado. Contactá al administrador." };
    }
  } catch {
    // si falla la verificación, seguimos (fail-open conservador para no bloquear UX)
  }

  // Rate limit (endpoint genérico "report")
  const rl = await checkRateLimit(claims.sub, "report");
  if (!rl.ok) {
    const minutos = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 60000));
    return {
      ok: false,
      error: `Demasiadas solicitudes. Probá de nuevo en ${minutos} min.`,
    };
  }

  const tier: ModelTier = input.reportType.includes("mensual") ? "premium" : "default";

  // Sanitizar PII antes de enviar a OpenAI
  const safeData = redactObject(input.data);

  const system = `Sos un analista financiero senior integrado al ERP SVI. Tu tarea es redactar el resumen ejecutivo de un reporte de caja para el responsable de la sucursal.

**Estilo:**
- Español argentino, vos (no tú).
- Tono profesional, claro, directo. Cero relleno.
- Markdown ligero permitido: **negritas** y guiones para listas. NO usar headers (#).
- Formato monetario argentino: $1.234.567,89 (punto miles, coma decimal).

**Reglas:**
1. NUNCA inventés números — sólo usá los datos provistos.
2. Mencioná tendencias o cambios sólo si están respaldados por datos comparativos.
3. Si los datos están vacíos o son insuficientes, decilo explícitamente.
4. PII viene redactada como [DNI], [CBU], [EMAIL], etc. — no intentes adivinarla.

**Output OBLIGATORIO:** SOLO JSON válido (sin markdown wrapper) con esta forma exacta:
{
  "narrative": "string con el resumen ejecutivo (200-450 palabras). Markdown ligero permitido.",
  "highlights": [
    { "label": "string corto (max 30 chars)", "value": "string formateado (max 40 chars)" }
  ]
}

**Highlights:**
- Entre 3 y 6 entradas.
- Cada highlight es un dato puntual (ej: "Saldo del día" / "$ 1.234.567,89").
- Pensalos como KPI cards: el lector los escanea de un vistazo.`;

  const tipoLabel = {
    arqueo_diario:       "Arqueo del día",
    cierre_mensual:      "Cierre mensual",
    comparativa_mensual: "Comparativa mensual",
  }[input.reportType];

  const user = `Tipo de reporte: **${tipoLabel}**
Período: ${input.period.from} → ${input.period.to}

Datos consolidados (JSON):
\`\`\`json
${JSON.stringify(safeData, null, 2)}
\`\`\`

Generá el resumen ejecutivo y los highlights ahora.`;

  let result;
  try {
    result = await chatCompletion({
      tier,
      system,
      user,
      jsonMode:    true,
      temperature: 0.4,
      maxTokens:   1200,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error generando narrativa IA",
    };
  }

  // Log tokens (no bloquea)
  await logTokenUsage({
    empresaId:  claims.empresa_id,
    userId:     claims.sub,
    endpoint:   "report",
    moduleKey:  "caja",
    model:      result.model,
    tokensIn:   result.tokensIn,
    tokensOut:  result.tokensOut,
    costUsd:    result.costUsd,
    cached:     false,
    requestId:  result.requestId,
  });

  let parsed: { narrative?: unknown; highlights?: unknown };
  try {
    parsed = JSON.parse(result.content) as { narrative?: unknown; highlights?: unknown };
  } catch {
    return { ok: false, error: "La IA devolvió un formato inválido. Probá de nuevo." };
  }

  const narrative = typeof parsed.narrative === "string" ? parsed.narrative.trim() : "";
  const highlights: ReporteHighlight[] = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .map((h): ReporteHighlight | null => {
          if (h && typeof h === "object") {
            const o = h as { label?: unknown; value?: unknown };
            if (typeof o.label === "string" && typeof o.value === "string") {
              return { label: o.label.slice(0, 30), value: o.value.slice(0, 40) };
            }
          }
          return null;
        })
        .filter((x): x is ReporteHighlight => x !== null)
        .slice(0, 6)
    : [];

  if (!narrative) {
    return { ok: false, error: "La IA no devolvió narrativa. Probá de nuevo." };
  }

  return { ok: true, data: { narrative, highlights } };
}
