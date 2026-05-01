import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { streamChatResponse } from "@/modules/ai/chat";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { ChatRequestSchema } from "@/modules/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.chat", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "chat");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { stream } = await streamChatResponse({
    empresaId:    claims.empresa_id,
    userId:       claims.sub,
    sessionId:    parsed.data.sessionId,
    contextScope: parsed.data.contextScope,
    message:      parsed.data.message,
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
