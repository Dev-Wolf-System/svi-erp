import "server-only";
import { chatCompletion } from "./client";
import { logTokenUsage } from "./audit";
import { type AnomaliesRequest, type Anomaly, type AnomaliesResponse } from "./schemas";

interface Stats {
  mean:   number;
  stddev: number;
  q1:     number;
  q3:     number;
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, stddev: 0, q1: 0, q3: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  return { mean, stddev, q1, q3 };
}

export interface DetectAnomaliesInput {
  empresaId: string;
  userId:    string;
  request:   AnomaliesRequest;
}

export async function detectAnomalies(input: DetectAnomaliesInput): Promise<AnomaliesResponse> {
  const { current, history, threshold } = input.request;
  const stats = computeStats(history);

  const candidates: Anomaly[] = [];
  for (const point of current) {
    const z = stats.stddev > 0 ? Math.abs(point.value - stats.mean) / stats.stddev : 0;
    if (z > threshold) {
      const severity =
        z > threshold * 1.5 ? "critical" :
        z > threshold       ? "warn"     : "info";
      candidates.push({
        entityId:      point.entityId,
        severity,
        reason:        "",  // se llena con LLM abajo
        value:         point.value,
        expectedRange: [stats.mean - threshold * stats.stddev, stats.mean + threshold * stats.stddev],
        zScore:        Number(z.toFixed(2)),
      });
    }
  }

  if (candidates.length === 0) return { anomalies: [] };

  // LLM para explicar las anomalías en lenguaje natural
  const system = `Sos un analista financiero. Explicás anomalías en datos de una concesionaria de autos en español argentino.

Para cada anomalía recibida, generá una razón corta (1 frase, max 100 chars) que explique POR QUÉ es atípica y qué podría significar.

Output JSON OBLIGATORIO:
{
  "explanations": [
    { "entityId": "...", "reason": "..." }
  ]
}`;

  const user = `Estadísticas del histórico:
- Media: ${stats.mean.toFixed(2)}
- Desvío estándar: ${stats.stddev.toFixed(2)}
- Q1: ${stats.q1.toFixed(2)}, Q3: ${stats.q3.toFixed(2)}

Anomalías detectadas (z-score):
${candidates.map((a) => `- entityId=${a.entityId}, valor=${a.value}, z=${a.zScore}, severidad=${a.severity}`).join("\n")}

Generá las explicaciones.`;

  const result = await chatCompletion({
    tier: "default",
    system,
    user,
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 600,
  });

  let parsed: { explanations: Array<{ entityId: string; reason: string }> } = { explanations: [] };
  try {
    parsed = JSON.parse(result.content);
  } catch {
    /* fallback abajo */
  }

  const reasonMap = new Map(parsed.explanations.map((e) => [e.entityId, e.reason]));
  const enriched: Anomaly[] = candidates.map((a) => ({
    ...a,
    reason: reasonMap.get(a.entityId) ?? `Valor atípico (z=${a.zScore})`,
  }));

  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "anomalies",
    moduleKey:  input.request.moduleKey,
    model:      result.model,
    tokensIn:   result.tokensIn,
    tokensOut:  result.tokensOut,
    costUsd:    result.costUsd,
    cached:     false,
    requestId:  result.requestId,
  });

  return { anomalies: enriched };
}
