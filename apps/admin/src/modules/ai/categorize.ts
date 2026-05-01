import "server-only";
import { createHash } from "node:crypto";
import { chatCompletion } from "./client";
import { cacheGet, cacheSet, makeCacheKey, TTL } from "./cache";
import { logTokenUsage } from "./audit";
import { redactPII } from "./redact";
import {
  type CategorizeRequest,
  type CategorizeResponse,
} from "./schemas";

export interface CategorizeInput {
  empresaId: string;
  userId:    string;
  request:   CategorizeRequest;
}

export async function categorize(input: CategorizeInput): Promise<CategorizeResponse> {
  const safeText = redactPII(input.request.text);
  const hash = createHash("sha1").update(`${input.request.moduleKey}|${safeText}`).digest("hex").slice(0, 16);
  const cacheKey = makeCacheKey(["ai", "cat", input.request.moduleKey, hash]);

  const cached = await cacheGet<CategorizeResponse>(cacheKey);
  if (cached) return cached;

  const optionsList = input.request.candidateCategories
    .map((c) => `  - ${c.value}: ${c.label}`)
    .join("\n");

  const system = `Sos un clasificador. Dado un concepto de movimiento de dinero, devolvé la categoría más probable de una lista cerrada.

Output JSON OBLIGATORIO:
{
  "suggested": "valor_de_la_categoria",
  "confidence": 0.0-1.0,
  "alternatives": [
    { "value": "otra_categoria", "confidence": 0.0-1.0 }
  ]
}

Reglas:
- "suggested" DEBE ser uno de los valores de la lista provista, exactamente.
- "confidence" alta (>0.85) sólo si el match es claro.
- "alternatives" hasta 2 categorías distintas a "suggested" con confianza decreciente.
- Si no podés decidir con confianza > 0.4, devolvé la primera de la lista con confidence=0.4.`;

  const user = `Concepto: "${safeText}"

Categorías candidatas:
${optionsList}

Devolvé el JSON.`;

  const result = await chatCompletion({
    tier: "cheap",
    system,
    user,
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 200,
  });

  let parsed: CategorizeResponse;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    // Fallback: primera categoría con confianza baja
    parsed = {
      suggested:    input.request.candidateCategories[0]?.value ?? "",
      confidence:   0.3,
      alternatives: [],
    };
  }

  // Validar que suggested esté en la lista
  const validValues = new Set(input.request.candidateCategories.map((c) => c.value));
  if (!validValues.has(parsed.suggested)) {
    parsed.suggested  = input.request.candidateCategories[0]?.value ?? "";
    parsed.confidence = 0.3;
  }

  await cacheSet(cacheKey, parsed, TTL.categorize);
  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "categorize",
    moduleKey:  input.request.moduleKey,
    model:      result.model,
    tokensIn:   result.tokensIn,
    tokensOut:  result.tokensOut,
    costUsd:    result.costUsd,
    cached:     false,
    requestId:  result.requestId,
  });

  return parsed;
}
