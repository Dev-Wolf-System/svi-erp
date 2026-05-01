-- ============================================================================
-- 0022 — IA: sesiones de chat persistidas + mensajes
-- ============================================================================
-- Decisiones (ver docs/superpowers/specs/2026-05-01-f6-caja-ia-transversal-design.md §4):
--   - 1 sesión por usuario+scope (ej "caja", "global"); historial completo.
--   - RLS por user_id y empresa_id (multi-tenant).
--   - Append-only: sin UPDATE/DELETE permitidos (auditabilidad).
--   - Política de retención: chats >90 días se borran vía cron n8n.
-- ============================================================================

CREATE TYPE ai_chat_role AS ENUM ('system', 'user', 'assistant', 'tool');

CREATE TABLE ai_chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope       VARCHAR(40) NOT NULL,             -- 'global' | 'caja' | 'ventas' | ...
  title       VARCHAR(120),                     -- generado por IA en primer mensaje
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_sessions_user ON ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ai_chat_sessions_empresa ON ai_chat_sessions(empresa_id);

CREATE TABLE ai_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role        ai_chat_role NOT NULL,
  content     TEXT NOT NULL,
  -- tool calls / results estructurados
  tool_name   VARCHAR(60),
  tool_args   JSONB,
  tool_result JSONB,
  -- métricas
  tokens_in   INT NOT NULL DEFAULT 0,
  tokens_out  INT NOT NULL DEFAULT 0,
  model       VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Sesiones: el usuario sólo ve las propias; admin de la empresa también
CREATE POLICY ai_chat_sessions_select ON ai_chat_sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'rol') IN ('super_admin', 'admin')
    )
  );

CREATE POLICY ai_chat_sessions_insert ON ai_chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid()
              AND empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid);

CREATE POLICY ai_chat_sessions_update ON ai_chat_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mensajes: heredan del session
CREATE POLICY ai_chat_messages_select ON ai_chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM ai_chat_sessions
      WHERE user_id = auth.uid()
         OR (
           empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
           AND (auth.jwt() -> 'app_metadata' ->> 'rol') IN ('super_admin', 'admin')
         )
    )
  );

CREATE POLICY ai_chat_messages_insert ON ai_chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid())
  );

-- Trigger: actualizar updated_at en sesión cuando llega mensaje
CREATE OR REPLACE FUNCTION trg_ai_chat_session_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_chat_messages_touch_session
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION trg_ai_chat_session_touch();
