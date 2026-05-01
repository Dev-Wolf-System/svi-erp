import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { chatCompletion } from "@/modules/ai/client";
import { logTokenUsage } from "@/modules/ai/audit";
import { redactObject } from "@/modules/ai/redact";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { AnalyzeRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "analyze");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const safeContext = redactObject(parsed.data.contextData ?? {});

  const system = `Sos un analista del módulo "${parsed.data.moduleKey}" en el ERP SVI.
Respondé la consulta del usuario en 1-3 frases, en español argentino, basándote SOLO en los datos provistos.
Si no podés responder con los datos, decilo.`;

  const user = `Consulta: ${parsed.data.query}

Datos disponibles:
\`\`\`json
${JSON.stringify(safeContext, null, 2)}
\`\`\``;

  try {
    const result = await chatCompletion({
      tier: "default",
      system,
      user,
      temperature: 0.4,
      maxTokens: 500,
    });

    await logTokenUsage({
      empresaId:  claims.empresa_id,
      userId:     claims.sub,
      endpoint:   "analyze",
      moduleKey:  parsed.data.moduleKey,
      model:      result.model,
      tokensIn:   result.tokensIn,
      tokensOut:  result.tokensOut,
      costUsd:    result.costUsd,
      cached:     false,
      requestId:  result.requestId,
    });

    return NextResponse.json({ answer: result.content });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al analizar" },
      { status: 500 },
    );
  }
}
