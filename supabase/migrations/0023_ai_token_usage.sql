-- ============================================================================
-- 0023 — IA: auditoría de tokens consumidos (control de costos)
-- ============================================================================
-- Cada llamada a OpenAI registra acá: usuario, módulo, modelo, tokens y costo.
-- Permite:
--   - Dashboard de uso por empresa (/admin/ia-usage)
--   - Alerta automática vía n8n cuando una empresa supera umbral
--   - Hard stop si supera presupuesto mensual
-- ============================================================================

CREATE TABLE ai_token_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    VARCHAR(40) NOT NULL,           -- 'insights' | 'chat' | 'categorize' | etc.
  module_key  VARCHAR(40),                    -- 'caja' | 'ventas' | null si global
  model       VARCHAR(40) NOT NULL,           -- 'gpt-5-mini' | 'gpt-5-nano' | etc.
  tokens_in   INT NOT NULL,
  tokens_out  INT NOT NULL,
  cost_usd    DECIMAL(10,6) NOT NULL,         -- microcentavos por precisión
  cached      BOOLEAN NOT NULL DEFAULT FALSE, -- true si vino de cache (cost_usd=0)
  request_id  TEXT,                           -- OpenAI response.id si aplica
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_token_empresa_fecha ON ai_token_usage(empresa_id, created_at DESC);
CREATE INDEX idx_ai_token_user_fecha ON ai_token_usage(user_id, created_at DESC);
CREATE INDEX idx_ai_token_endpoint ON ai_token_usage(endpoint, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Solo admin/super_admin de la empresa pueden ver el uso
CREATE POLICY ai_token_usage_select ON ai_token_usage FOR SELECT
  USING (
    empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'rol') IN ('super_admin', 'admin')
  );

-- Insert: solo el service role (server-side); usuarios no insertan directo
-- (no creamos policy de insert pública — el role anon/authenticated no puede insertar)

-- ─── Vista helper: uso del mes actual por empresa ───────────────────────────
CREATE OR REPLACE VIEW ai_usage_current_month AS
SELECT
  empresa_id,
  COUNT(*)                              AS total_calls,
  SUM(tokens_in)                        AS total_tokens_in,
  SUM(tokens_out)                       AS total_tokens_out,
  SUM(cost_usd)                         AS total_cost_usd,
  SUM(CASE WHEN cached THEN 0 ELSE 1 END) AS uncached_calls
FROM ai_token_usage
WHERE created_at >= date_trunc('month', NOW())
GROUP BY empresa_id;
