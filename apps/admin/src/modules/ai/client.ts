import "server-only";
import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export type ModelTier = "default" | "cheap" | "premium";

export function modelFor(tier: ModelTier): string {
  switch (tier) {
    case "cheap":   return process.env.OPENAI_CHEAP_MODEL   ?? "gpt-5-nano";
    case "premium": return process.env.OPENAI_PREMIUM_MODEL ?? "gpt-5";
    default:        return process.env.OPENAI_DEFAULT_MODEL ?? "gpt-5-mini";
  }
}

export const EMBEDDINGS_MODEL =
  process.env.OPENAI_EMBEDDINGS_MODEL ?? "text-embedding-3-small";

// Tabla de precios USD por 1M tokens (actualizar cuando OpenAI cambie)
// Estos valores son estimativos para 2026 — ajustar al implementar.
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-5":                    { in: 5.00,  out: 15.00 },
  "gpt-5-mini":               { in: 0.30,  out: 1.20 },
  "gpt-5-nano":               { in: 0.05,  out: 0.20 },
  "text-embedding-3-small":   { in: 0.02,  out: 0 },
  "text-embedding-3-large":   { in: 0.13,  out: 0 },
};

export function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? PRICING["gpt-5-mini"]!;
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
}

export interface ChatCompletionInput {
  tier: ModelTier;
  system: string;
  user: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionOutput {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  requestId: string | null;
}

export async function chatCompletion(input: ChatCompletionInput): Promise<ChatCompletionOutput> {
  const client = getClient();
  const model = modelFor(input.tier);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user",   content: input.user },
    ],
    temperature: input.temperature ?? 0.4,
    max_tokens:  input.maxTokens   ?? 1000,
    ...(input.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  const content = response.choices[0]?.message?.content ?? "";
  const tokensIn  = response.usage?.prompt_tokens     ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;

  return {
    content,
    model,
    tokensIn,
    tokensOut,
    costUsd: calcCost(model, tokensIn, tokensOut),
    requestId: response.id ?? null,
  };
}

export async function generateEmbedding(text: string): Promise<{
  vector: number[];
  tokensIn: number;
  costUsd: number;
}> {
  const client = getClient();
  const response = await client.embeddings.create({
    model: EMBEDDINGS_MODEL,
    input: text,
  });
  const vector = response.data[0]?.embedding ?? [];
  const tokensIn = response.usage?.prompt_tokens ?? 0;
  return {
    vector,
    tokensIn,
    costUsd: calcCost(EMBEDDINGS_MODEL, tokensIn, 0),
  };
}

export function getOpenAIClient(): OpenAI {
  return getClient();
}
