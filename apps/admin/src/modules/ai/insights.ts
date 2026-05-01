import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chatCompletion } from "./client";
import { cacheGet, cacheSet, makeCacheKey, TTL } from "./cache";
import { logTokenUsage } from "./audit";
import { redactObject } from "./redact";
import {
  InsightsResponseSchema,
  type InsightsScope,
  type InsightsResponse,
  type Insight,
} from "./schemas";

const PROMPTS_DIR = join(process.cwd(), "src/modules/ai/prompts");

function loadPrompt(name: string): string {
  return readFileSync(join(PROMPTS_DIR, `${name}.md`), "utf8");
}

export interface GenerateInsightsInput {
  empresaId: string;
  userId:    string;
  moduleKey: string;
  scope:     InsightsScope;
  fresh?:    boolean;
  /** Datos crudos del módulo (movimientos, ventas, etc.) — se redactan PII automáticamente */
  contextData: unknown;
}

export async function generateInsights(input: GenerateInsightsInput): Promise<InsightsResponse> {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = makeCacheKey([
    "ai", "insights",
    input.empresaId, input.userId, input.moduleKey, input.scope, today,
  ]);

  if (!input.fresh) {
    const cached = await cacheGet<InsightsResponse>(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const systemBase = loadPrompt("system-base");
  let moduleCtx = "";
  try {
    moduleCtx = loadPrompt(input.moduleKey);
  } catch {
    moduleCtx = `**Contexto:** módulo ${input.moduleKey} (sin contexto específico cargado).`;
  }

  const safeData = redactObject(input.contextData);

  const system = `${systemBase}

${moduleCtx}

**Tu tarea:** Generar entre 3 y 5 insights accionables sobre el estado actual del módulo.

**Output OBLIGATORIO:** JSON con esta forma exacta:
{
  "insights": [
    {
      "severity": "info" | "warn" | "success" | "critical",
      "icon": "TrendingUp" | "AlertTriangle" | "CheckCircle" | "DollarSign" | "Lock" | "Calendar" | "Activity",
      "title": "string corto (max 60 chars)",
      "description": "1-2 frases con dato concreto",
      "action": { "label": "Ver detalle", "href": "/ruta" }   // opcional
    }
  ]
}

**Severidad:**
- info: dato neutro relevante
- success: tendencia positiva confirmada
- warn: situación a vigilar (no crítica)
- critical: requiere acción inmediata

**Reglas:**
- NO inventes números — sólo usa los datos provistos.
- Si los datos están vacíos, devolvé 1 insight tipo "info" diciendo "Aún no hay datos suficientes para generar insights".`;

  const user = `Datos del módulo "${input.moduleKey}" (alcance: ${input.scope}):

\`\`\`json
${JSON.stringify(safeData, null, 2)}
\`\`\`

Generá los insights ahora.`;

  const result = await chatCompletion({
    tier: "default",
    system,
    user,
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 800,
  });

  let parsed: { insights: Insight[] };
  try {
    parsed = JSON.parse(result.content) as { insights: Insight[] };
  } catch {
    parsed = { insights: [] };
  }

  const response: InsightsResponse = {
    insights:    Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [],
    generatedAt: new Date().toISOString(),
    cached:      false,
  };

  // Validar contra schema; si falla, devolver lista vacía en lugar de romper
  const validated = InsightsResponseSchema.safeParse(response);
  const finalResponse: InsightsResponse = validated.success ? validated.data : {
    insights: [],
    generatedAt: response.generatedAt,
    cached: false,
  };

  await cacheSet(cacheKey, finalResponse, TTL.insights);
  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "insights",
    moduleKey:  input.moduleKey,
    model:      result.model,
    tokensIn:   result.tokensIn,
    tokensOut:  result.tokensOut,
    costUsd:    result.costUsd,
    cached:     false,
    requestId:  result.requestId,
  });

  return finalResponse;
}
