import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { chatCompletion } from "@/modules/ai/client";
import { logTokenUsage } from "@/modules/ai/audit";
import { redactObject } from "@/modules/ai/redact";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { ReportRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.report", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos para generar reportes IA" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "report");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = ReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const safeData = redactObject(parsed.data.data ?? {});

  // Reportes mensuales/trimestrales usan modelo premium
  const isPremium = parsed.data.reportType.includes("mensual") || parsed.data.reportType.includes("trimestral");

  const system = `Sos un analista financiero senior. Generás reportes ejecutivos para concesionarias de vehículos en español argentino.

Output JSON OBLIGATORIO:
{
  "narrative": "Resumen ejecutivo de 3-5 párrafos. Markdown ligero. Sin headers (#).",
  "highlights": [
    { "label": "Saldo neto", "value": "$1.234.567" },
    { "label": "Variación vs mes anterior", "value": "+12,5%" }
  ]
}

Reglas:
- Usá SOLO los datos provistos.
- Tono profesional pero accesible.
- Si hay tendencias claras (positivas/negativas), destacalas.
- Si los datos son insuficientes, decilo en la narrativa.`;

  const user = `Tipo de reporte: ${parsed.data.reportType}
Módulo: ${parsed.data.moduleKey}
Período: ${parsed.data.period.from} a ${parsed.data.period.to}

Datos:
\`\`\`json
${JSON.stringify(safeData, null, 2)}
\`\`\`

Generá el reporte.`;

  try {
    const result = await chatCompletion({
      tier:        isPremium ? "premium" : "default",
      system,
      user,
      jsonMode:    true,
      temperature: 0.3,
      maxTokens:   isPremium ? 2000 : 1200,
    });

    let parsedReport: { narrative: string; highlights: Array<{ label: string; value: string }> };
    try {
      parsedReport = JSON.parse(result.content);
    } catch {
      parsedReport = {
        narrative: "No se pudo generar el reporte automáticamente.",
        highlights: [],
      };
    }

    await logTokenUsage({
      empresaId:  claims.empresa_id,
      userId:     claims.sub,
      endpoint:   "report",
      moduleKey:  parsed.data.moduleKey,
      model:      result.model,
      tokensIn:   result.tokensIn,
      tokensOut:  result.tokensOut,
      costUsd:    result.costUsd,
      cached:     false,
      requestId:  result.requestId,
    });

    return NextResponse.json(parsedReport);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar reporte" },
      { status: 500 },
    );
  }
}
