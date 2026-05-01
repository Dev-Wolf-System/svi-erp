import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface TokenUsageEntry {
  empresaId: string;
  userId: string;
  endpoint: string;
  moduleKey: string | null;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cached: boolean;
  requestId: string | null;
}

/**
 * Registra una llamada a IA en `ai_token_usage`.
 * Falla silenciosa: si no se puede guardar, log a stderr (visible en Sentry).
 */
export async function logTokenUsage(entry: TokenUsageEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_token_usage").insert({
      empresa_id:  entry.empresaId,
      user_id:     entry.userId,
      endpoint:    entry.endpoint,
      module_key:  entry.moduleKey,
      model:       entry.model,
      tokens_in:   entry.tokensIn,
      tokens_out:  entry.tokensOut,
      cost_usd:    entry.costUsd,
      cached:      entry.cached,
      request_id:  entry.requestId,
    });
    if (error) {
      // Solo log a stderr — nunca rompemos por audit fallido
      // eslint-disable-next-line no-console
      console.error("[ai.audit] logTokenUsage failed:", error.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ai.audit] logTokenUsage exception:", e);
  }
}

export interface MonthlyUsage {
  totalCalls:    number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd:  number;
  uncachedCalls: number;
}

/** Devuelve uso del mes actual para una empresa. Usado para hard stop por presupuesto. */
export async function getMonthlyUsage(empresaId: string): Promise<MonthlyUsage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_usage_current_month")
    .select("total_calls, total_tokens_in, total_tokens_out, total_cost_usd, uncached_calls")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  return {
    totalCalls:     Number(data?.total_calls         ?? 0),
    totalTokensIn:  Number(data?.total_tokens_in     ?? 0),
    totalTokensOut: Number(data?.total_tokens_out    ?? 0),
    totalCostUsd:   Number(data?.total_cost_usd      ?? 0),
    uncachedCalls:  Number(data?.uncached_calls      ?? 0),
  };
}

/** Hard stop: devuelve true si la empresa superó el presupuesto mensual. */
export async function isOverBudget(empresaId: string): Promise<boolean> {
  const budget = Number(process.env.AI_MONTHLY_BUDGET_USD ?? 100);
  const usage = await getMonthlyUsage(empresaId);
  return usage.totalCostUsd >= budget;
}
