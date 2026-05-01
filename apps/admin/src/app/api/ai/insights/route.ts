import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { generateInsights } from "@/modules/ai/insights";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { InsightsRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json(
      { error: "Presupuesto mensual de IA agotado", code: "over_budget" },
      { status: 402 },
    );
  }

  const rl = await checkRateLimit(claims.sub, "insights");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // contextData es genérico — viene como prop adicional fuera del schema base
  const baseParse = InsightsRequestSchema.safeParse(body);
  if (!baseParse.success) {
    return NextResponse.json(
      { error: baseParse.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const contextData = (body as { contextData?: unknown }).contextData ?? {};

  try {
    const result = await generateInsights({
      empresaId:   claims.empresa_id,
      userId:      claims.sub,
      moduleKey:   baseParse.data.moduleKey,
      scope:       baseParse.data.scope,
      fresh:       baseParse.data.fresh,
      contextData,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar insights" },
      { status: 500 },
    );
  }
}
