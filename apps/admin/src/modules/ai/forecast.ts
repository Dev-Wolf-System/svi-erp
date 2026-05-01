import "server-only";
import { chatCompletion } from "./client";
import { cacheGet, cacheSet, makeCacheKey, TTL } from "./cache";
import { logTokenUsage } from "./audit";
import {
  type ForecastRequest,
  type ForecastResponse,
  type ForecastPoint,
} from "./schemas";

interface LinearFit {
  slope:     number;
  intercept: number;
  r2:        number;
  residualStd: number;
}

function fitLinear(points: { x: number; y: number }[]): LinearFit {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  const num   = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den   = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => {
    const yhat = slope * p.x + intercept;
    return s + (p.y - yhat) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const residualStd = Math.sqrt(ssRes / Math.max(1, n - 2));

  return { slope, intercept, r2, residualStd };
}

function addDays(yyyymmdd: string, days: number): string {
  const d = new Date(`${yyyymmdd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface GenerateForecastInput {
  empresaId: string;
  userId:    string;
  request:   ForecastRequest;
}

export async function generateForecast(input: GenerateForecastInput): Promise<ForecastResponse> {
  const { historical, horizonDays, metric, moduleKey } = input.request;

  const cacheKey = makeCacheKey([
    "ai", "forecast",
    input.empresaId, moduleKey, metric, horizonDays,
    historical[historical.length - 1]?.date ?? "",
  ]);
  const cached = await cacheGet<ForecastResponse>(cacheKey);
  if (cached) return cached;

  // Convertir fechas a índice numérico (días desde la primera)
  const baseDate = historical[0]!.date;
  const points = historical.map((h, i) => ({ x: i, y: h.value }));
  const fit = fitLinear(points);

  const lastIdx = historical.length - 1;
  const lastDate = historical[lastIdx]!.date;
  const ci95 = 1.96 * fit.residualStd;

  const forecast: ForecastPoint[] = [];
  for (let d = 1; d <= horizonDays; d++) {
    const x = lastIdx + d;
    const value = fit.slope * x + fit.intercept;
    forecast.push({
      date:  addDays(lastDate, d),
      value: Number(value.toFixed(2)),
      lower: Number((value - ci95).toFixed(2)),
      upper: Number((value + ci95).toFixed(2)),
    });
  }

  const lastValue   = historical[lastIdx]!.value;
  const finalValue  = forecast[forecast.length - 1]!.value;
  const pctChange   = lastValue !== 0 ? ((finalValue - lastValue) / Math.abs(lastValue)) * 100 : 0;
  const trend: "up" | "down" | "flat" =
    Math.abs(pctChange) < 5 ? "flat" :
    pctChange > 0           ? "up"   : "down";

  // Narrativa LLM
  const system = `Sos un analista. Dada una proyección estadística, devolvé una narrativa en español argentino, 1-2 frases, sin headers, con un dato concreto.

Output JSON: { "narrative": "..." }`;

  const user = `Métrica: ${metric}
Módulo: ${moduleKey}
Valor actual: ${lastValue.toFixed(2)}
Valor proyectado a ${horizonDays} días: ${finalValue.toFixed(2)}
Cambio %: ${pctChange.toFixed(1)}%
Tendencia: ${trend}
R² del modelo: ${fit.r2.toFixed(2)} (${fit.r2 > 0.7 ? "alta" : fit.r2 > 0.4 ? "media" : "baja"} confianza)

Generá la narrativa.`;

  const result = await chatCompletion({
    tier: "default",
    system,
    user,
    jsonMode: true,
    temperature: 0.4,
    maxTokens: 200,
  });

  let narrative = "Proyección generada con datos históricos disponibles.";
  try {
    const parsed = JSON.parse(result.content);
    if (typeof parsed.narrative === "string") narrative = parsed.narrative;
  } catch {
    /* keep default */
  }

  const response: ForecastResponse = { forecast, narrative, trend };

  await cacheSet(cacheKey, response, TTL.forecast);
  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "forecast",
    moduleKey,
    model:      result.model,
    tokensIn:   result.tokensIn,
    tokensOut:  result.tokensOut,
    costUsd:    result.costUsd,
    cached:     false,
    requestId:  result.requestId,
  });

  // Silenciar lint si baseDate no se usa explícitamente
  void baseDate;

  return response;
}
