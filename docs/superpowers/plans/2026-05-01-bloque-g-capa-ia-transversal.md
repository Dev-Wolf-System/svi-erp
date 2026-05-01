# Bloque G — Capa IA Transversal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la capa de IA transversal del ERP SVI (módulo `ai/` + endpoints `/api/ai/*` + componentes reutilizables `<AiInsightsWidget>`, `<AiAnomalyBadge>`, `<AiSuggestInput>`, `<AiForecastChart>`, `<AiChatFloating>`) lista para ser consumida por todos los módulos del sistema (Caja, Ventas, Inversiones, etc.).

**Architecture:** OpenAI como LLM provider (gpt-5-mini default, gpt-5-nano para alta frecuencia, gpt-5 para reportes premium, text-embedding-3-small para búsqueda semántica). Cache + rate limiting con Upstash Redis. Vector DB con pgvector embebido en Supabase. Audit log de tokens consumidos. RBAC + RLS estrictos. Streaming SSE para chat conversacional. Componentes React reutilizables con prop `moduleKey` para context-awareness.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5.9 · Supabase Postgres + pgvector · OpenAI Node SDK 4.x · @upstash/redis + @upstash/ratelimit · Zod · React Query · Sonner · Tailwind 4 · lucide-react

**Spec referencia:** `docs/superpowers/specs/2026-05-01-f6-caja-ia-transversal-design.md` secciones 4, 5, 8.1, 9, 10, 11.

**Reference para subagents:** ya hay módulos similares en `apps/admin/src/modules/` (caja, agenda, secretaria, leads). Seguir ese patrón: `schemas.ts` (Zod) + `queries.ts` (server-only reads) + `actions.ts` (server actions). Usar `getSviClaims()` para auth + `can(perm, rol)` para RBAC en cada server entry point.

---

## File Structure

### Migrations nuevas
- `supabase/migrations/0022_ai_chat_sessions.sql` — sesiones + mensajes de chat IA con RLS
- `supabase/migrations/0023_ai_token_usage.sql` — auditoría de costos por usuario/módulo/modelo
- `supabase/migrations/0024_pgvector_embeddings.sql` — extensión pgvector + tabla embeddings genérica con RLS

### Módulo `apps/admin/src/modules/ai/`
- `client.ts` — wrapper OpenAI con selector de modelo (mini/nano/full) + helpers
- `rate-limit.ts` — Upstash rate limiter por usuario y endpoint
- `audit.ts` — logging de tokens consumidos a `ai_token_usage`
- `cache.ts` — wrapper Upstash Redis con get/set/del tipados
- `redact.ts` — sanitización de PII antes de enviar a OpenAI
- `schemas.ts` — Zod schemas para inputs/outputs de TODOS los endpoints
- `insights.ts` — generación de insights con cache 24h
- `anomalies.ts` — detección estadística (z-score) + explicación LLM
- `categorize.ts` — categorización con `gpt-5-nano`
- `forecast.ts` — regresión lineal + narrativa LLM
- `embeddings.ts` — generación + búsqueda KNN con pgvector
- `chat.ts` — sesiones persistidas + streaming SSE
- `prompts/system-base.md` — system prompt base del asistente
- `prompts/caja.md` — contexto específico módulo caja
- `index.ts` — barrel export controlado (sólo tipos + funciones server-safe)

### API Routes `apps/admin/src/app/api/ai/`
- `insights/route.ts` — POST genera/devuelve insights
- `categorize/route.ts` — POST categoriza concepto → categoría
- `anomalies/route.ts` — POST detecta anomalías
- `forecast/route.ts` — POST proyección temporal
- `chat/route.ts` — POST chat con SSE streaming
- `analyze/route.ts` — POST análisis ad-hoc en lenguaje natural
- `report/route.ts` — POST genera narrativa de reporte (PDF generation viene en Bloque D)

### Componentes UI `apps/admin/src/components/ai/`
- `ai-insights-widget.tsx` — `<AiInsightsWidget moduleKey="caja" />`
- `ai-anomaly-badge.tsx` — `<AiAnomalyBadge severity reason />`
- `ai-suggest-input.tsx` — `<AiSuggestInput onSuggest moduleKey />`
- `ai-forecast-chart.tsx` — `<AiForecastChart historical forecast />`
- `ai-narrative-block.tsx` — `<AiNarrativeBlock content />`
- `ai-chat-floating.tsx` — `<AiChatFloating />` (montado en topbar)

### Modificaciones
- `apps/admin/.env.example` — agregar variables OpenAI + Upstash
- `apps/admin/package.json` — deps: `openai`, `@upstash/redis`, `@upstash/ratelimit`
- `apps/admin/src/components/layout/topbar.tsx` — botón asistente flotante
- `packages/utils/src/auth/permissions.ts` — agregar permisos `ia.*`

---

## Pre-requisitos (validar antes de Task 1)

- [ ] `OPENAI_API_KEY` provista por cliente y con saldo disponible
- [ ] Cuenta Upstash creada → `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` obtenidos
- [ ] Supabase self-hosted con extensión `vector` instalable (verificar con `SELECT * FROM pg_available_extensions WHERE name = 'vector'`)
- [ ] Sucursales y empresa demo cargadas en DB para poder hacer smoke tests

---

## Task 1: Setup de dependencias y variables de entorno

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/.env.example`

- [ ] **Step 1: Instalar dependencias OpenAI + Upstash**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm install openai@^4.77.0 @upstash/redis@^1.34.3 @upstash/ratelimit@^2.0.5
```

Expected: `package.json` actualizado con las 3 dependencias, `node_modules` actualizado, sin errores de peer deps.

- [ ] **Step 2: Verificar instalación**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && grep -E "openai|@upstash/redis|@upstash/ratelimit" apps/admin/package.json
```

Expected: las 3 entradas listadas en `dependencies`.

- [ ] **Step 3: Agregar variables de entorno al `.env.example`**

Append al final del archivo `apps/admin/.env.example`:

```bash

# ─── IA (OpenAI) ─────────────────────────────────────────────────────────────
OPENAI_API_KEY=
OPENAI_DEFAULT_MODEL=gpt-5-mini
OPENAI_CHEAP_MODEL=gpt-5-nano
OPENAI_PREMIUM_MODEL=gpt-5
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small

# ─── Cache / Rate Limit (Upstash Redis) ──────────────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── IA — controles ──────────────────────────────────────────────────────────
# Hard cap mensual por empresa (USD) — alerta a $50 si <100, hard stop al valor
AI_MONTHLY_BUDGET_USD=100
# Rate limit por usuario por hora (requests)
AI_RATE_LIMIT_PER_HOUR=100
```

- [ ] **Step 4: Validar que `.env.local` tenga las variables reales**

```bash
grep -E "OPENAI_API_KEY|UPSTASH_REDIS" /mnt/d/Proyectos-Dev/svi-erp/apps/admin/.env.local 2>/dev/null | wc -l
```

Expected: `>= 3`. Si es 0, pedir al usuario que complete `.env.local` con valores reales antes de continuar.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/package.json apps/admin/.env.example apps/admin/package-lock.json 2>/dev/null || git add apps/admin/package.json apps/admin/.env.example
git commit -m "chore(F6.G): deps openai + @upstash/redis + ratelimit + env template"
```

---

## Task 2: Migration 0022 — sesiones de chat IA

**Files:**
- Create: `supabase/migrations/0022_ai_chat_sessions.sql`

- [ ] **Step 1: Crear migration SQL**

Create file `supabase/migrations/0022_ai_chat_sessions.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar migration localmente y verificar**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && npm run db:push 2>&1 | tail -20
```

Expected: migration aplicada sin errores. Si falla por dependencias (`empresas`, `auth.users`), verificar que existan migraciones previas.

- [ ] **Step 3: Verificar tablas creadas**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && PGPASSWORD="$(grep POSTGRES_PASSWORD .env 2>/dev/null | cut -d= -f2)" psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "\dt ai_chat*"
```

Expected: 2 tablas listadas: `ai_chat_sessions`, `ai_chat_messages`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0022_ai_chat_sessions.sql
git commit -m "feat(F6.G): migration 0022 — ai_chat_sessions + ai_chat_messages con RLS"
```

---

## Task 3: Migration 0023 — auditoría de tokens

**Files:**
- Create: `supabase/migrations/0023_ai_token_usage.sql`

- [ ] **Step 1: Crear migration SQL**

Create file `supabase/migrations/0023_ai_token_usage.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar migration**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && npm run db:push 2>&1 | tail -10
```

Expected: migration aplicada sin errores.

- [ ] **Step 3: Verificar tabla**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "\d ai_token_usage" 2>&1 | head -20
```

Expected: 12 columnas listadas, 3 índices.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0023_ai_token_usage.sql
git commit -m "feat(F6.G): migration 0023 — ai_token_usage para tracking de costos"
```

---

## Task 4: Migration 0024 — pgvector + embeddings

**Files:**
- Create: `supabase/migrations/0024_pgvector_embeddings.sql`

- [ ] **Step 1: Crear migration SQL**

Create file `supabase/migrations/0024_pgvector_embeddings.sql`:

```sql
-- ============================================================================
-- 0024 — IA: pgvector para búsqueda semántica
-- ============================================================================
-- Tabla genérica que almacena embeddings de cualquier entidad (movimientos,
-- ventas, clientes, etc.). Indexada para KNN rápido.
-- ============================================================================

-- Habilitar extensión vector (Supabase la ofrece nativa)
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE ai_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  entity_type  VARCHAR(40) NOT NULL,         -- 'movimiento_caja' | 'venta' | 'cliente' | etc.
  entity_id    UUID NOT NULL,                -- referencia polimórfica al registro
  content      TEXT NOT NULL,                -- texto que se embebió (para debugging)
  embedding    vector(1536) NOT NULL,        -- dim de text-embedding-3-small
  metadata     JSONB,                        -- info adicional (categoria, monto, etc.)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_ai_embeddings_empresa ON ai_embeddings(empresa_id);
CREATE INDEX idx_ai_embeddings_entity ON ai_embeddings(entity_type, entity_id);

-- Índice KNN aproximado (HNSW es más nuevo y mejor que IVFFlat para Supabase ≥0.7)
-- Si la versión de pgvector no soporta HNSW, fallback a IVFFlat: ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
CREATE INDEX idx_ai_embeddings_knn ON ai_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_embeddings_select ON ai_embeddings FOR SELECT
  USING (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid);

-- Insert/update/delete: solo service role (server-side)

-- ─── Función helper: búsqueda KNN con filtro de empresa ─────────────────────
CREATE OR REPLACE FUNCTION ai_search_similar(
  query_embedding vector(1536),
  filter_empresa_id UUID,
  filter_entity_type VARCHAR DEFAULT NULL,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  entity_type VARCHAR,
  entity_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM ai_embeddings e
  WHERE e.empresa_id = filter_empresa_id
    AND (filter_entity_type IS NULL OR e.entity_type = filter_entity_type)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 2: Verificar disponibilidad de pgvector ANTES de aplicar**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

Expected: una fila con `name=vector`. Si no aparece, parar y avisar al usuario que necesita instalar pgvector en su Supabase self-hosted antes de continuar.

- [ ] **Step 3: Aplicar migration**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && npm run db:push 2>&1 | tail -15
```

Expected: migration aplicada. Si falla en HNSW por versión vieja de pgvector, reemplazar el bloque del índice por:

```sql
CREATE INDEX idx_ai_embeddings_knn ON ai_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

- [ ] **Step 4: Verificar tabla y función**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "\d ai_embeddings" && psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "\df ai_search_similar"
```

Expected: tabla con columna `embedding` tipo `vector(1536)`, función `ai_search_similar` listada.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0024_pgvector_embeddings.sql
git commit -m "feat(F6.G): migration 0024 — pgvector + ai_embeddings + ai_search_similar"
```

---

## Task 5: Permisos RBAC para IA

**Files:**
- Modify: `packages/utils/src/auth/permissions.ts`

- [ ] **Step 1: Agregar permisos `ia.*`**

En `packages/utils/src/auth/permissions.ts`, dentro del objeto `PERMISSIONS`, agregar después de la línea `"agenda.gestionar_turno": ...`:

```typescript
  // ─── IA ───────────────────────────────────────────────────────────────────
  "ia.use":          ["super_admin", "admin", "gerente", "vendedor", "secretaria", "caja"],
  "ia.chat":         ["super_admin", "admin", "gerente", "vendedor", "secretaria", "caja"],
  "ia.report":       ["super_admin", "admin", "gerente"],
  "ia.usage_view":   ["super_admin", "admin"],
  "ia.config":       ["super_admin"],
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && npm run check-types 2>&1 | grep -E "error|permissions" | head -10
```

Expected: sin errores. Si falla porque algún rol no existe, alinear con `@repo/config/constants`.

- [ ] **Step 3: Commit**

```bash
git add packages/utils/src/auth/permissions.ts
git commit -m "feat(F6.G): permisos RBAC ia.use/chat/report/usage_view/config"
```

---

## Task 6: `modules/ai/client.ts` — wrapper OpenAI

**Files:**
- Create: `apps/admin/src/modules/ai/client.ts`

- [ ] **Step 1: Crear el wrapper**

Create `apps/admin/src/modules/ai/client.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|client.ts" | head -10
```

Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/client.ts
git commit -m "feat(F6.G): modules/ai/client.ts — wrapper OpenAI con selector de modelo"
```

---

## Task 7: `modules/ai/cache.ts` — wrapper Upstash Redis

**Files:**
- Create: `apps/admin/src/modules/ai/cache.ts`

- [ ] **Step 1: Crear cache helper**

Create `apps/admin/src/modules/ai/cache.ts`:

```typescript
import "server-only";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL/TOKEN no configurados");
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const TTL_24H_SECONDS = 60 * 60 * 24;
const TTL_7D_SECONDS  = TTL_24H_SECONDS * 7;
const TTL_4H_SECONDS  = 60 * 60 * 4;
const TTL_1H_SECONDS  = 60 * 60;

export const TTL = {
  insights:   TTL_24H_SECONDS,
  categorize: TTL_7D_SECONDS,
  forecast:   TTL_4H_SECONDS,
  anomalies:  TTL_1H_SECONDS,
} as const;

/** GET con tipado y deserialización JSON. Devuelve null si no existe. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const v = await redis.get<T>(key);
    return v ?? null;
  } catch {
    return null; // si Redis está caído, no rompemos la app — saltamos cache
  }
}

/** SET con TTL en segundos. Silenciosamente falla si Redis está caído. */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    /* ignore */
  }
}

/** Invalida una clave o un patrón con prefijo. */
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch {
    /* ignore */
  }
}

/** Construye una clave de cache estandarizada. */
export function makeCacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, "_")).join(":");
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|cache" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/cache.ts
git commit -m "feat(F6.G): modules/ai/cache.ts — wrapper Upstash Redis con TTL estándar"
```

---

## Task 8: `modules/ai/rate-limit.ts` — rate limiter por usuario

**Files:**
- Create: `apps/admin/src/modules/ai/rate-limit.ts`

- [ ] **Step 1: Crear rate limiter**

Create `apps/admin/src/modules/ai/rate-limit.ts`:

```typescript
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./cache";

let _limiterStandard: Ratelimit | null = null;
let _limiterChat: Ratelimit | null = null;

function getStandardLimiter(): Ratelimit {
  if (_limiterStandard) return _limiterStandard;
  const max = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 100);
  _limiterStandard = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(max, "1 h"),
    prefix: "ai_rl",
  });
  return _limiterStandard;
}

function getChatLimiter(): Ratelimit {
  // chat es más permisivo: 30 mensajes / 5min
  if (_limiterChat) return _limiterChat;
  _limiterChat = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, "5 m"),
    prefix: "ai_rl_chat",
  });
  return _limiterChat;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number; // ms timestamp
}

/**
 * Verifica el rate limit por usuario+endpoint.
 * Devuelve `{ ok: false }` cuando se superó el límite.
 * Si Upstash está caído, devuelve `{ ok: true }` (fail-open) — no rompe app.
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
): Promise<RateLimitResult> {
  try {
    const limiter = endpoint === "chat" ? getChatLimiter() : getStandardLimiter();
    const key = `${userId}:${endpoint}`;
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch {
    // fail-open: no bloqueamos si Redis cayó
    return { ok: true, remaining: 999, resetAt: Date.now() + 3600_000 };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|rate-limit" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/rate-limit.ts
git commit -m "feat(F6.G): modules/ai/rate-limit.ts — Upstash sliding window por usuario"
```

---

## Task 9: `modules/ai/audit.ts` — logging de tokens

**Files:**
- Create: `apps/admin/src/modules/ai/audit.ts`

- [ ] **Step 1: Crear el audit logger**

Create `apps/admin/src/modules/ai/audit.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|audit" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/audit.ts
git commit -m "feat(F6.G): modules/ai/audit.ts — logTokenUsage + isOverBudget"
```

---

## Task 10: `modules/ai/redact.ts` — sanitización de PII

**Files:**
- Create: `apps/admin/src/modules/ai/redact.ts`

- [ ] **Step 1: Crear el sanitizer**

Create `apps/admin/src/modules/ai/redact.ts`:

```typescript
import "server-only";

/**
 * Sanitiza texto antes de enviarlo a OpenAI.
 *
 * Reemplaza patrones de PII con placeholders genéricos:
 *   - DNI (7-8 dígitos)        → [DNI]
 *   - CUIT/CUIL (XX-XXXXXXXX-X) → [CUIT]
 *   - CBU (22 dígitos)          → [CBU]
 *   - Tarjetas (16 dígitos)     → [TARJETA]
 *   - Emails                    → [EMAIL]
 *   - Teléfonos AR              → [TEL]
 *
 * NO sanitiza nombres, montos ni conceptos — eso es contexto de negocio
 * útil para la IA y no es PII estricto.
 */
export function redactPII(input: string): string {
  if (!input) return input;
  let s = input;

  // CUIT/CUIL — debe ir antes que DNI para no chocar
  s = s.replace(/\b\d{2}-?\d{8}-?\d\b/g, "[CUIT]");

  // CBU
  s = s.replace(/\b\d{22}\b/g, "[CBU]");

  // Tarjetas (16 dígitos con o sin separador)
  s = s.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[TARJETA]");

  // Emails
  s = s.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]");

  // Teléfonos AR (con o sin código país)
  s = s.replace(/\b(?:\+?54\s?)?(?:9\s?)?(?:\d{2,4}[\s-]?)?\d{4}[\s-]?\d{4}\b/g, "[TEL]");

  // DNI (7-8 dígitos al final)
  s = s.replace(/\b\d{7,8}\b/g, "[DNI]");

  return s;
}

/** Sanitiza un objeto recursivamente (sólo strings). */
export function redactObject<T>(obj: T): T {
  if (typeof obj === "string") return redactPII(obj) as T;
  if (Array.isArray(obj)) return obj.map(redactObject) as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactObject(v);
    }
    return out as T;
  }
  return obj;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|redact" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/redact.ts
git commit -m "feat(F6.G): modules/ai/redact.ts — sanitización PII (DNI/CUIT/CBU/tarjeta/email/tel)"
```

---

## Task 11: `modules/ai/schemas.ts` — Zod schemas

**Files:**
- Create: `apps/admin/src/modules/ai/schemas.ts`

- [ ] **Step 1: Crear los schemas**

Create `apps/admin/src/modules/ai/schemas.ts`:

```typescript
import { z } from "zod";

// ─── Insights ────────────────────────────────────────────────────────────────

export const InsightsScopeSchema = z.enum(["day", "week", "month"]);
export type InsightsScope = z.infer<typeof InsightsScopeSchema>;

export const InsightsRequestSchema = z.object({
  moduleKey: z.string().min(1).max(40),
  scope:     InsightsScopeSchema.default("day"),
  fresh:     z.boolean().optional(),
});
export type InsightsRequest = z.infer<typeof InsightsRequestSchema>;

export const InsightSeveritySchema = z.enum(["info", "warn", "success", "critical"]);
export type InsightSeverity = z.infer<typeof InsightSeveritySchema>;

export const InsightSchema = z.object({
  severity:    InsightSeveritySchema,
  icon:        z.string(),
  title:       z.string(),
  description: z.string(),
  action:      z.object({ label: z.string(), href: z.string() }).optional(),
});
export type Insight = z.infer<typeof InsightSchema>;

export const InsightsResponseSchema = z.object({
  insights:    z.array(InsightSchema),
  generatedAt: z.string(),
  cached:      z.boolean(),
});
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;

// ─── Categorize ──────────────────────────────────────────────────────────────

export const CategorizeRequestSchema = z.object({
  moduleKey:           z.string().min(1).max(40),
  text:                z.string().min(2).max(300),
  candidateCategories: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).min(1).max(20),
});
export type CategorizeRequest = z.infer<typeof CategorizeRequestSchema>;

export const CategorizeResponseSchema = z.object({
  suggested:    z.string(),
  confidence:   z.number().min(0).max(1),
  alternatives: z.array(z.object({
    value:      z.string(),
    confidence: z.number().min(0).max(1),
  })),
});
export type CategorizeResponse = z.infer<typeof CategorizeResponseSchema>;

// ─── Anomalies ───────────────────────────────────────────────────────────────

export const AnomalyDataPointSchema = z.object({
  entityId: z.string(),
  value:    z.number(),
  label:    z.string().optional(),
});

export const AnomaliesRequestSchema = z.object({
  moduleKey: z.string().min(1).max(40),
  current:   z.array(AnomalyDataPointSchema),
  history:   z.array(z.number()).min(3),
  threshold: z.number().min(1).max(5).default(2.5),
});
export type AnomaliesRequest = z.infer<typeof AnomaliesRequestSchema>;

export const AnomalySchema = z.object({
  entityId:      z.string(),
  severity:      InsightSeveritySchema,
  reason:        z.string(),
  value:         z.number(),
  expectedRange: z.tuple([z.number(), z.number()]),
  zScore:        z.number(),
});
export type Anomaly = z.infer<typeof AnomalySchema>;

export const AnomaliesResponseSchema = z.object({
  anomalies: z.array(AnomalySchema),
});
export type AnomaliesResponse = z.infer<typeof AnomaliesResponseSchema>;

// ─── Forecast ────────────────────────────────────────────────────────────────

export const ForecastDataPointSchema = z.object({
  date:  z.string(),  // YYYY-MM-DD
  value: z.number(),
});

export const ForecastRequestSchema = z.object({
  moduleKey:    z.string().min(1).max(40),
  metric:       z.string().min(1).max(40),  // 'saldo' | 'ventas' | etc.
  historical:   z.array(ForecastDataPointSchema).min(7),
  horizonDays:  z.number().int().min(1).max(90).default(30),
});
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

export const ForecastPointSchema = z.object({
  date:  z.string(),
  value: z.number(),
  lower: z.number(),
  upper: z.number(),
});
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;

export const ForecastResponseSchema = z.object({
  forecast:  z.array(ForecastPointSchema),
  narrative: z.string(),
  trend:     z.enum(["up", "down", "flat"]),
});
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

// ─── Chat ────────────────────────────────────────────────────────────────────

export const ChatRequestSchema = z.object({
  sessionId:    z.string().uuid().nullable().optional(),
  message:      z.string().min(1).max(2000),
  contextScope: z.string().min(1).max(40).default("global"),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ─── Analyze ─────────────────────────────────────────────────────────────────

export const AnalyzeRequestSchema = z.object({
  moduleKey:   z.string().min(1).max(40),
  query:       z.string().min(3).max(500),
  contextData: z.unknown().optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeResponseSchema = z.object({
  answer:    z.string(),
  citations: z.array(z.object({
    entityId: z.string(),
    snippet:  z.string(),
  })).optional(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

// ─── Report (narrativa, no PDF aún) ──────────────────────────────────────────

export const ReportRequestSchema = z.object({
  moduleKey:  z.string().min(1).max(40),
  reportType: z.string().min(1).max(40),  // 'arqueo_diario' | 'cierre_mensual' | etc.
  period:     z.object({
    from: z.string(),  // YYYY-MM-DD
    to:   z.string(),
  }),
  data:       z.unknown(),  // datos crudos del módulo
});
export type ReportRequest = z.infer<typeof ReportRequestSchema>;

export const ReportResponseSchema = z.object({
  narrative: z.string(),
  highlights: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })),
});
export type ReportResponse = z.infer<typeof ReportResponseSchema>;

// ─── Action result común para server actions ────────────────────────────────

export type AiActionResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string; code?: "rate_limit" | "over_budget" | "forbidden" | "invalid" | "upstream" };
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|schemas" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/schemas.ts
git commit -m "feat(F6.G): modules/ai/schemas.ts — Zod schemas todos los endpoints"
```

---

## Task 12: `modules/ai/prompts/system-base.md` y `caja.md`

**Files:**
- Create: `apps/admin/src/modules/ai/prompts/system-base.md`
- Create: `apps/admin/src/modules/ai/prompts/caja.md`

- [ ] **Step 1: Crear prompt base**

Create `apps/admin/src/modules/ai/prompts/system-base.md`:

```markdown
Sos un asistente IA integrado al sistema de gestión SVI-ERP, un ERP/CRM para una concesionaria de vehículos con fondo común de inversión (FCI).

**Tu rol:**
- Analizás datos del usuario y le das insights accionables.
- Hablás en español argentino, en tono profesional pero cercano (vos, no tú).
- Sos breve y directo. Cero relleno.

**Reglas:**
1. NUNCA inventés números — si no tenés el dato, decilo.
2. NUNCA des consejos médicos, legales, ni de inversión personal sin disclaimer.
3. Si una operación no podés hacerla con las herramientas disponibles, decilo en vez de fingir.
4. Datos personales (DNI, CBU, tarjetas) en los inputs vienen redactados como [DNI], [CBU], etc. — no intentes desambiguarlos.
5. Cuando devuelvas JSON, devolvé SOLO JSON válido sin markdown ni texto extra.
6. Cuando devuelvas texto narrativo, usá markdown ligero (negritas, listas) pero sin headers (#).

**Formato monetario:** Argentina usa $ con punto de miles y coma decimal: $1.234.567,89
```

- [ ] **Step 2: Crear contexto de Caja**

Create `apps/admin/src/modules/ai/prompts/caja.md`:

```markdown
**Contexto del módulo Caja:**

El módulo Caja registra movimientos de dinero (ingresos/egresos) por sucursal. Al final del día se hace un "cierre de caja" que consolida los totales y bloquea modificaciones.

**Categorías de ingreso:**
- venta_contado — Venta de vehículo al contado
- venta_anticipo — Anticipo o señal de venta
- cobro_cuota — Cobro de cuota financiada
- inversion_capital — Ingreso de capital al FCI (de un inversor)
- transferencia — Transferencia recibida
- otro_ingreso — Otro ingreso

**Categorías de egreso:**
- compra_vehiculo — Compra de vehículo para stock
- liquidacion_inversion — Pago de liquidación FCI a inversor
- gasto_operativo — Gasto operativo (luz, alquiler, etc.)
- pago_proveedor — Pago a proveedor
- retiro — Retiro de fondos
- transferencia — Transferencia enviada
- otro_egreso — Otro egreso

**Monedas:** ARS (default) y USD.

**Glosario:**
- "Saldo" = ingresos - egresos (del período)
- "Cierre" = bloqueo del día; los movimientos cerrados no se pueden anular
- "Arqueo" = recuento físico vs sistema
- FCI = Fondo Común de Inversión (los inversores aportan capital y reciben liquidaciones)
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/prompts/
git commit -m "feat(F6.G): modules/ai/prompts/ — system-base + caja context"
```

---

## Task 13: `modules/ai/insights.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/insights.ts`

- [ ] **Step 1: Crear el generador**

Create `apps/admin/src/modules/ai/insights.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|insights" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/insights.ts
git commit -m "feat(F6.G): modules/ai/insights.ts — generación con cache + audit + redact"
```

---

## Task 14: `modules/ai/anomalies.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/anomalies.ts`

- [ ] **Step 1: Crear detector estadístico + LLM**

Create `apps/admin/src/modules/ai/anomalies.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|anomalies" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/anomalies.ts
git commit -m "feat(F6.G): modules/ai/anomalies.ts — z-score + explicación LLM"
```

---

## Task 15: `modules/ai/categorize.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/categorize.ts`

- [ ] **Step 1: Crear categorizador**

Create `apps/admin/src/modules/ai/categorize.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|categorize" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/categorize.ts
git commit -m "feat(F6.G): modules/ai/categorize.ts — gpt-5-nano con cache 7d"
```

---

## Task 16: `modules/ai/forecast.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/forecast.ts`

- [ ] **Step 1: Crear forecast con regresión lineal + narrativa**

Create `apps/admin/src/modules/ai/forecast.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|forecast" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/forecast.ts
git commit -m "feat(F6.G): modules/ai/forecast.ts — regresión lineal + IC95% + narrativa LLM"
```

---

## Task 17: `modules/ai/embeddings.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/embeddings.ts`

- [ ] **Step 1: Crear el módulo de embeddings**

Create `apps/admin/src/modules/ai/embeddings.ts`:

```typescript
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./client";
import { logTokenUsage } from "./audit";
import { redactPII } from "./redact";

export interface UpsertEmbeddingInput {
  empresaId:  string;
  userId:     string;
  entityType: string;
  entityId:   string;
  content:    string;
  metadata?:  Record<string, unknown>;
}

export async function upsertEmbedding(input: UpsertEmbeddingInput): Promise<void> {
  const safe = redactPII(input.content).slice(0, 1500);
  const emb = await generateEmbedding(safe);

  const supabase = await createClient();
  await supabase.from("ai_embeddings").upsert(
    {
      empresa_id:  input.empresaId,
      entity_type: input.entityType,
      entity_id:   input.entityId,
      content:     safe,
      embedding:   emb.vector,
      metadata:    input.metadata ?? {},
    },
    { onConflict: "entity_type,entity_id" },
  );

  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "embeddings",
    moduleKey:  null,
    model:      "text-embedding-3-small",
    tokensIn:   emb.tokensIn,
    tokensOut:  0,
    costUsd:    emb.costUsd,
    cached:     false,
    requestId:  null,
  });
}

export interface SearchSimilarInput {
  empresaId:    string;
  userId:       string;
  query:        string;
  entityType?:  string;
  matchCount?:  number;
  threshold?:   number;
}

export interface SimilarResult {
  id:         string;
  entityType: string;
  entityId:   string;
  content:    string;
  metadata:   Record<string, unknown> | null;
  similarity: number;
}

export async function searchSimilar(input: SearchSimilarInput): Promise<SimilarResult[]> {
  const safe = redactPII(input.query);
  const emb = await generateEmbedding(safe);

  const supabase = await createClient();
  const { data } = await supabase.rpc("ai_search_similar", {
    query_embedding:    emb.vector as unknown as string,
    filter_empresa_id:  input.empresaId,
    filter_entity_type: input.entityType ?? null,
    match_count:        input.matchCount ?? 10,
    match_threshold:    input.threshold  ?? 0.7,
  });

  await logTokenUsage({
    empresaId:  input.empresaId,
    userId:     input.userId,
    endpoint:   "embeddings_search",
    moduleKey:  null,
    model:      "text-embedding-3-small",
    tokensIn:   emb.tokensIn,
    tokensOut:  0,
    costUsd:    emb.costUsd,
    cached:     false,
    requestId:  null,
  });

  return (data ?? []).map((row: {
    id: string;
    entity_type: string;
    entity_id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }) => ({
    id:         row.id,
    entityType: row.entity_type,
    entityId:   row.entity_id,
    content:    row.content,
    metadata:   row.metadata,
    similarity: row.similarity,
  }));
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|embeddings" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/embeddings.ts
git commit -m "feat(F6.G): modules/ai/embeddings.ts — upsert + KNN search vía pgvector"
```

---

## Task 18: `modules/ai/chat.ts`

**Files:**
- Create: `apps/admin/src/modules/ai/chat.ts`

- [ ] **Step 1: Crear el módulo de chat con streaming**

Create `apps/admin/src/modules/ai/chat.ts`:

```typescript
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getOpenAIClient, modelFor, calcCost } from "./client";
import { createClient } from "@/lib/supabase/server";
import { logTokenUsage } from "./audit";
import { redactPII } from "./redact";

const PROMPTS_DIR = join(process.cwd(), "src/modules/ai/prompts");

function loadPrompt(name: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, `${name}.md`), "utf8");
  } catch {
    return "";
  }
}

export interface StartChatInput {
  empresaId:    string;
  userId:       string;
  sessionId?:   string | null;
  contextScope: string;
  message:      string;
}

interface ChatMessageRow {
  role:    "system" | "user" | "assistant";
  content: string;
}

async function getOrCreateSession(input: {
  empresaId: string;
  userId: string;
  sessionId?: string | null;
  scope: string;
}): Promise<string> {
  const supabase = await createClient();

  if (input.sessionId) {
    const { data } = await supabase
      .from("ai_chat_sessions")
      .select("id")
      .eq("id", input.sessionId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data } = await supabase
    .from("ai_chat_sessions")
    .insert({
      empresa_id: input.empresaId,
      user_id:    input.userId,
      scope:      input.scope,
      title:      null,
    })
    .select("id")
    .single();

  if (!data?.id) throw new Error("No se pudo crear la sesión de chat");
  return data.id;
}

async function loadHistory(sessionId: string, limit = 20): Promise<ChatMessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []).filter((m) => m.role === "user" || m.role === "assistant") as ChatMessageRow[];
}

/**
 * Genera la respuesta del asistente en streaming.
 * Devuelve un ReadableStream de eventos SSE listos para mandar al cliente.
 */
export async function streamChatResponse(input: StartChatInput): Promise<{
  stream:    ReadableStream<Uint8Array>;
  sessionId: string;
}> {
  const sessionId = await getOrCreateSession({
    empresaId: input.empresaId,
    userId:    input.userId,
    sessionId: input.sessionId,
    scope:     input.contextScope,
  });

  const safeMessage = redactPII(input.message);

  // Persistir mensaje del usuario antes de generar
  const supabase = await createClient();
  await supabase.from("ai_chat_messages").insert({
    session_id: sessionId,
    role:       "user",
    content:    safeMessage,
  });

  const history = await loadHistory(sessionId);

  const systemBase = loadPrompt("system-base");
  const moduleCtx = input.contextScope !== "global" ? loadPrompt(input.contextScope) : "";
  const system = `${systemBase}\n\n${moduleCtx}`.trim();

  const model = modelFor("default");
  const client = getOpenAIClient();

  const encoder = new TextEncoder();
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let assistantContent = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system" as const, content: system },
            ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user" as const, content: safeMessage },
          ],
          stream: true,
          temperature: 0.5,
          max_tokens: 800,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            assistantContent += delta;
            sendEvent({ type: "token", delta });
          }
          // Algunas APIs reportan usage al final del stream
          // @ts-expect-error - usage no siempre está tipado en chunks
          if (chunk.usage) {
            // @ts-expect-error
            totalTokensIn = chunk.usage.prompt_tokens ?? 0;
            // @ts-expect-error
            totalTokensOut = chunk.usage.completion_tokens ?? 0;
          }
        }

        // Persistir respuesta del asistente
        await supabase.from("ai_chat_messages").insert({
          session_id: sessionId,
          role:       "assistant",
          content:    assistantContent,
          tokens_in:  totalTokensIn,
          tokens_out: totalTokensOut,
          model,
        });

        // Si no llegó usage del stream, estimar (aprox 4 chars/token)
        if (totalTokensIn === 0) totalTokensIn = Math.ceil((system.length + safeMessage.length) / 4);
        if (totalTokensOut === 0) totalTokensOut = Math.ceil(assistantContent.length / 4);

        await logTokenUsage({
          empresaId:  input.empresaId,
          userId:     input.userId,
          endpoint:   "chat",
          moduleKey:  input.contextScope === "global" ? null : input.contextScope,
          model,
          tokensIn:   totalTokensIn,
          tokensOut:  totalTokensOut,
          costUsd:    calcCost(model, totalTokensIn, totalTokensOut),
          cached:     false,
          requestId:  null,
        });

        sendEvent({ type: "done", sessionId, tokensIn: totalTokensIn, tokensOut: totalTokensOut });
        controller.close();
      } catch (err) {
        sendEvent({ type: "error", message: err instanceof Error ? err.message : "stream error" });
        controller.close();
      }
    },
  });

  return { stream, sessionId };
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|chat.ts" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/chat.ts
git commit -m "feat(F6.G): modules/ai/chat.ts — sesiones persistidas + streaming SSE"
```

---

## Task 19: API endpoint `/api/ai/insights`

**Files:**
- Create: `apps/admin/src/app/api/ai/insights/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `apps/admin/src/app/api/ai/insights/route.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|insights/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/insights/route.ts
git commit -m "feat(F6.G): api/ai/insights — endpoint con RBAC + rate limit + budget"
```

---

## Task 20: API endpoint `/api/ai/categorize`

**Files:**
- Create: `apps/admin/src/app/api/ai/categorize/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `apps/admin/src/app/api/ai/categorize/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { categorize } from "@/modules/ai/categorize";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { CategorizeRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "categorize");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = CategorizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    const result = await categorize({
      empresaId: claims.empresa_id,
      userId:    claims.sub,
      request:   parsed.data,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al categorizar" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|categorize/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/categorize/route.ts
git commit -m "feat(F6.G): api/ai/categorize — endpoint con RBAC + rate limit"
```

---

## Task 21: API endpoint `/api/ai/anomalies`

**Files:**
- Create: `apps/admin/src/app/api/ai/anomalies/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `apps/admin/src/app/api/ai/anomalies/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { detectAnomalies } from "@/modules/ai/anomalies";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { AnomaliesRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "anomalies");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = AnomaliesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    const result = await detectAnomalies({
      empresaId: claims.empresa_id,
      userId:    claims.sub,
      request:   parsed.data,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al detectar anomalías" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|anomalies/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/anomalies/route.ts
git commit -m "feat(F6.G): api/ai/anomalies — endpoint con z-score + LLM"
```

---

## Task 22: API endpoint `/api/ai/forecast`

**Files:**
- Create: `apps/admin/src/app/api/ai/forecast/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `apps/admin/src/app/api/ai/forecast/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { generateForecast } from "@/modules/ai/forecast";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { ForecastRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "forecast");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = ForecastRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    const result = await generateForecast({
      empresaId: claims.empresa_id,
      userId:    claims.sub,
      request:   parsed.data,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar forecast" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|forecast/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/forecast/route.ts
git commit -m "feat(F6.G): api/ai/forecast — endpoint con regresión + narrativa"
```

---

## Task 23: API endpoint `/api/ai/chat` con SSE

**Files:**
- Create: `apps/admin/src/app/api/ai/chat/route.ts`

- [ ] **Step 1: Crear el route handler con streaming**

Create `apps/admin/src/app/api/ai/chat/route.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|chat/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/chat/route.ts
git commit -m "feat(F6.G): api/ai/chat — endpoint SSE streaming"
```

---

## Task 24: API endpoint `/api/ai/analyze`

**Files:**
- Create: `apps/admin/src/app/api/ai/analyze/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `apps/admin/src/app/api/ai/analyze/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { chatCompletion } from "@/modules/ai/client";
import { logTokenUsage } from "@/modules/ai/audit";
import { redactObject } from "@/modules/ai/redact";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { AnalyzeRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.use", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "analyze");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const safeContext = redactObject(parsed.data.contextData ?? {});

  const system = `Sos un analista del módulo "${parsed.data.moduleKey}" en el ERP SVI.
Respondé la consulta del usuario en 1-3 frases, en español argentino, basándote SOLO en los datos provistos.
Si no podés responder con los datos, decilo.`;

  const user = `Consulta: ${parsed.data.query}

Datos disponibles:
\`\`\`json
${JSON.stringify(safeContext, null, 2)}
\`\`\``;

  try {
    const result = await chatCompletion({
      tier: "default",
      system,
      user,
      temperature: 0.4,
      maxTokens: 500,
    });

    await logTokenUsage({
      empresaId:  claims.empresa_id,
      userId:     claims.sub,
      endpoint:   "analyze",
      moduleKey:  parsed.data.moduleKey,
      model:      result.model,
      tokensIn:   result.tokensIn,
      tokensOut:  result.tokensOut,
      costUsd:    result.costUsd,
      cached:     false,
      requestId:  result.requestId,
    });

    return NextResponse.json({ answer: result.content });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al analizar" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|analyze/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/analyze/route.ts
git commit -m "feat(F6.G): api/ai/analyze — análisis ad-hoc en lenguaje natural"
```

---

## Task 25: API endpoint `/api/ai/report`

**Files:**
- Create: `apps/admin/src/app/api/ai/report/route.ts`

- [ ] **Step 1: Crear el route handler (sólo narrativa, PDF en bloque D)**

Create `apps/admin/src/app/api/ai/report/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { chatCompletion } from "@/modules/ai/client";
import { logTokenUsage } from "@/modules/ai/audit";
import { redactObject } from "@/modules/ai/redact";
import { checkRateLimit } from "@/modules/ai/rate-limit";
import { isOverBudget } from "@/modules/ai/audit";
import { ReportRequestSchema } from "@/modules/ai/schemas";

export async function POST(req: NextRequest) {
  const claims = await getSviClaims();
  if (!claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can("ia.report", claims.rol)) {
    return NextResponse.json({ error: "Sin permisos para generar reportes IA" }, { status: 403 });
  }

  if (await isOverBudget(claims.empresa_id)) {
    return NextResponse.json({ error: "Presupuesto agotado", code: "over_budget" }, { status: 402 });
  }

  const rl = await checkRateLimit(claims.sub, "report");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit superado", code: "rate_limit", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = ReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const safeData = redactObject(parsed.data.data ?? {});

  // Reportes mensuales/trimestrales usan modelo premium
  const isPremium = parsed.data.reportType.includes("mensual") || parsed.data.reportType.includes("trimestral");

  const system = `Sos un analista financiero senior. Generás reportes ejecutivos para concesionarias de vehículos en español argentino.

Output JSON OBLIGATORIO:
{
  "narrative": "Resumen ejecutivo de 3-5 párrafos. Markdown ligero. Sin headers (#).",
  "highlights": [
    { "label": "Saldo neto", "value": "$1.234.567" },
    { "label": "Variación vs mes anterior", "value": "+12,5%" }
  ]
}

Reglas:
- Usá SOLO los datos provistos.
- Tono profesional pero accesible.
- Si hay tendencias claras (positivas/negativas), destacalas.
- Si los datos son insuficientes, decilo en la narrativa.`;

  const user = `Tipo de reporte: ${parsed.data.reportType}
Módulo: ${parsed.data.moduleKey}
Período: ${parsed.data.period.from} a ${parsed.data.period.to}

Datos:
\`\`\`json
${JSON.stringify(safeData, null, 2)}
\`\`\`

Generá el reporte.`;

  try {
    const result = await chatCompletion({
      tier:        isPremium ? "premium" : "default",
      system,
      user,
      jsonMode:    true,
      temperature: 0.3,
      maxTokens:   isPremium ? 2000 : 1200,
    });

    let parsedReport: { narrative: string; highlights: Array<{ label: string; value: string }> };
    try {
      parsedReport = JSON.parse(result.content);
    } catch {
      parsedReport = {
        narrative: "No se pudo generar el reporte automáticamente.",
        highlights: [],
      };
    }

    await logTokenUsage({
      empresaId:  claims.empresa_id,
      userId:     claims.sub,
      endpoint:   "report",
      moduleKey:  parsed.data.moduleKey,
      model:      result.model,
      tokensIn:   result.tokensIn,
      tokensOut:  result.tokensOut,
      costUsd:    result.costUsd,
      cached:     false,
      requestId:  result.requestId,
    });

    return NextResponse.json(parsedReport);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar reporte" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|report/route" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/ai/report/route.ts
git commit -m "feat(F6.G): api/ai/report — narrativa con tier premium para mensuales"
```

---

## Task 26: Componente `<AiInsightsWidget>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-insights-widget.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/admin/src/components/ai/ai-insights-widget.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, RefreshCw, TrendingUp, AlertTriangle, CheckCircle,
  DollarSign, Lock, Calendar, Activity, Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Insight, InsightsResponse } from "@/modules/ai/schemas";

const ICONS = {
  TrendingUp, AlertTriangle, CheckCircle, DollarSign, Lock, Calendar, Activity, Sparkles,
} as const;

const SEVERITY_CLASSES = {
  info:     "border-svi-info/30 bg-svi-info/5 text-svi-info",
  warn:     "border-svi-warning/30 bg-svi-warning/5 text-svi-warning",
  success:  "border-svi-success/30 bg-svi-success/5 text-svi-success",
  critical: "border-svi-error/30 bg-svi-error/5 text-svi-error",
} as const;

interface Props {
  moduleKey:   string;
  scope?:      "day" | "week" | "month";
  contextData: unknown;
  className?:  string;
}

export function AiInsightsWidget({ moduleKey, scope = "day", contextData, className }: Props) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchInsights(fresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, scope, fresh, contextData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as InsightsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchInsights(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, scope]);

  return (
    <section className={`rounded-2xl border border-svi-border-muted bg-svi-card p-4 ${className ?? ""}`}>
      <header className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-svi-white">
          <Sparkles className="size-4 text-svi-gold" />
          Insights IA
          {data?.cached && (
            <span className="text-[10px] uppercase tracking-wider text-svi-muted-2">cached</span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => void fetchInsights(true)}
          disabled={loading}
          className="text-svi-muted hover:text-svi-white transition disabled:opacity-50 p-1"
          aria-label="Refrescar insights"
          title="Refrescar"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </button>
      </header>

      {loading && !data && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-svi-elevated animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-svi-error py-2">No se pudieron cargar los insights: {error}</p>
      )}

      {data && data.insights.length === 0 && !loading && (
        <p className="text-xs text-svi-muted-2 py-2">Aún no hay datos suficientes para generar insights.</p>
      )}

      <ul className="space-y-2">
        {data?.insights.map((ins, i) => (
          <InsightRow key={i} insight={ins} />
        ))}
      </ul>
    </section>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const Icon = (ICONS[insight.icon as keyof typeof ICONS] as typeof Sparkles | undefined) ?? Sparkles;
  const cls = SEVERITY_CLASSES[insight.severity];
  const body = (
    <div className={`rounded-lg border ${cls} p-3 flex items-start gap-3`}>
      <Icon className="size-4 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-svi-white leading-snug">{insight.title}</p>
        <p className="text-xs text-svi-muted mt-0.5 leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
  return insight.action?.href ? (
    <li>
      <Link href={insight.action.href} className="block hover:opacity-90 transition">
        {body}
      </Link>
    </li>
  ) : (
    <li>{body}</li>
  );
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|ai-insights" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/ai/ai-insights-widget.tsx
git commit -m "feat(F6.G): <AiInsightsWidget> — widget reutilizable con refresh + skeleton"
```

---

## Task 27: Componente `<AiAnomalyBadge>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-anomaly-badge.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/admin/src/components/ai/ai-anomaly-badge.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  severity: "info" | "warn" | "success" | "critical";
  reason:   string;
  size?:    "xs" | "sm";
}

const COLORS = {
  info:     "text-svi-info bg-svi-info/10 border-svi-info/30",
  warn:     "text-svi-warning bg-svi-warning/10 border-svi-warning/30",
  success:  "text-svi-success bg-svi-success/10 border-svi-success/30",
  critical: "text-svi-error bg-svi-error/10 border-svi-error/30",
} as const;

export function AiAnomalyBadge({ severity, reason, size = "xs" }: Props) {
  const [open, setOpen] = useState(false);
  const sizeClass = size === "xs" ? "size-3" : "size-3.5";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center rounded-full border ${COLORS[severity]} p-1`}
        title="Anomalía detectada"
        aria-label="Anomalía detectada — click para ver detalle"
      >
        <AlertTriangle className={sizeClass} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-30 w-64 rounded-lg border ${COLORS[severity]} bg-svi-card p-3 shadow-xl`}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 text-svi-muted-2 hover:text-svi-white"
            aria-label="Cerrar"
          >
            <X className="size-3" />
          </button>
          <p className="text-xs font-medium pr-4">Anomalía detectada</p>
          <p className="text-xs text-svi-muted mt-1 leading-relaxed">{reason}</p>
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|anomaly-badge" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/ai/ai-anomaly-badge.tsx
git commit -m "feat(F6.G): <AiAnomalyBadge> — badge inline con popover"
```

---

## Task 28: Componente `<AiSuggestInput>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-suggest-input.tsx`

- [ ] **Step 1: Crear el componente con debounce**

Create `apps/admin/src/components/ai/ai-suggest-input.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import type { CategorizeResponse } from "@/modules/ai/schemas";

interface Category {
  value: string;
  label: string;
}

interface Props {
  text:                 string;
  moduleKey:            string;
  candidateCategories:  Category[];
  onSuggest:            (suggestion: { value: string; confidence: number } | null) => void;
  /** Confianza mínima para auto-aplicar (default 0.8) */
  autoApplyThreshold?:  number;
  /** Delay del debounce en ms (default 600) */
  debounceMs?:          number;
}

export function AiSuggestInput({
  text,
  moduleKey,
  candidateCategories,
  onSuggest,
  autoApplyThreshold = 0.8,
  debounceMs = 600,
}: Props) {
  const [suggestion, setSuggestion] = useState<CategorizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>("");

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed === lastTextRef.current) {
      if (trimmed.length < 3) {
        setSuggestion(null);
        onSuggest(null);
      }
      return;
    }

    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(async () => {
      lastTextRef.current = trimmed;
      setLoading(true);
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKey,
            text: trimmed,
            candidateCategories,
          }),
        });
        if (!res.ok) {
          setSuggestion(null);
          onSuggest(null);
          return;
        }
        const data = (await res.json()) as CategorizeResponse;
        setSuggestion(data);
        if (data.confidence >= autoApplyThreshold) {
          onSuggest({ value: data.suggested, confidence: data.confidence });
        } else {
          onSuggest(null);
        }
      } catch {
        setSuggestion(null);
        onSuggest(null);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debouncedRef.current) clearTimeout(debouncedRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, moduleKey]);

  if (!suggestion && !loading) return null;

  if (loading) {
    return (
      <p className="text-xs text-svi-muted-2 mt-1 flex items-center gap-1">
        <Sparkles className="size-3 animate-pulse" />
        Buscando categoría sugerida…
      </p>
    );
  }

  if (!suggestion) return null;

  const found = candidateCategories.find((c) => c.value === suggestion.suggested);
  const confidencePct = Math.round(suggestion.confidence * 100);

  return (
    <p className="text-xs mt-1 flex items-center gap-1.5 text-svi-gold">
      <Sparkles className="size-3" />
      Sugerencia IA: <strong className="text-svi-white">{found?.label ?? suggestion.suggested}</strong>
      <span className="text-svi-muted-2">({confidencePct}%)</span>
      {suggestion.confidence >= autoApplyThreshold && <Check className="size-3 text-svi-success" />}
    </p>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|suggest-input" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/ai/ai-suggest-input.tsx
git commit -m "feat(F6.G): <AiSuggestInput> — autosugerencia categoría con debounce 600ms"
```

---

## Task 29: Componente `<AiNarrativeBlock>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-narrative-block.tsx`

- [ ] **Step 1: Crear bloque de narrativa renderable**

Create `apps/admin/src/components/ai/ai-narrative-block.tsx`:

```tsx
"use client";

import { Sparkles } from "lucide-react";

interface Props {
  content:   string;
  title?:    string;
  className?: string;
}

/**
 * Renderiza un bloque de texto generado por IA.
 * Soporta markdown ligero: negritas (**), saltos de línea, listas con guiones.
 * No usamos un parser MD completo para evitar dependencias y XSS.
 */
export function AiNarrativeBlock({ content, title, className }: Props) {
  const lines = content.split("\n");

  return (
    <div className={`rounded-2xl border border-svi-gold/20 bg-svi-gold/5 p-4 ${className ?? ""}`}>
      <header className="flex items-center gap-2 mb-2 text-svi-gold text-xs font-semibold uppercase tracking-wider">
        <Sparkles className="size-3.5" />
        {title ?? "Análisis IA"}
      </header>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed === "") return <div key={i} className="h-1" />;

          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <p key={i} className="text-sm text-svi-white leading-relaxed pl-4 relative">
                <span className="absolute left-0 top-2 size-1 rounded-full bg-svi-gold" />
                <FormatLine text={trimmed.slice(2)} />
              </p>
            );
          }
          return (
            <p key={i} className="text-sm text-svi-white leading-relaxed">
              <FormatLine text={trimmed} />
            </p>
          );
        })}
      </div>
    </div>
  );
}

function FormatLine({ text }: { text: string }) {
  // Renderiza **negrita** sin parser completo
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|narrative-block" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/ai/ai-narrative-block.tsx
git commit -m "feat(F6.G): <AiNarrativeBlock> — render markdown ligero seguro"
```

---

## Task 30: Componente `<AiForecastChart>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-forecast-chart.tsx`

- [ ] **Step 1: Verificar dependencia Recharts**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && grep recharts package.json || npm install recharts@^2.15.0
```

Expected: `recharts` ya instalado o se instala. Si se instaló, hacer commit aparte:

```bash
git add apps/admin/package.json apps/admin/package-lock.json 2>/dev/null
git commit -m "chore(F6.G): añadir recharts para gráficos"
```

- [ ] **Step 2: Crear componente**

Create `apps/admin/src/components/ai/ai-forecast-chart.tsx`:

```tsx
"use client";

import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { ForecastPoint } from "@/modules/ai/schemas";

interface HistoricalPoint {
  date:  string;
  value: number;
}

interface Props {
  historical: HistoricalPoint[];
  forecast:   ForecastPoint[];
  title?:     string;
  height?:    number;
}

interface CombinedPoint {
  date:     string;
  actual?:  number;
  forecast?: number;
  range?:   [number, number];
}

function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

interface TooltipPayloadItem {
  name:  string;
  value: number | string;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-svi-border-muted bg-svi-card p-3 shadow-xl">
      <p className="text-xs text-svi-muted">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{typeof p.value === "number" ? formatARS(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function AiForecastChart({ historical, forecast, title, height = 240 }: Props) {
  const combined: CombinedPoint[] = [
    ...historical.map((h) => ({ date: h.date, actual: h.value })),
    ...forecast.map((f) => ({
      date:     f.date,
      forecast: f.value,
      range:    [f.lower, f.upper] as [number, number],
    })),
  ];

  return (
    <div className="rounded-2xl border border-svi-border-muted bg-svi-card p-4">
      {title && <h3 className="text-sm font-semibold text-svi-white mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={combined} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#1A2236" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#6B7A9E" tick={{ fontSize: 10 }} />
          <YAxis stroke="#6B7A9E" tick={{ fontSize: 10 }} tickFormatter={(v) => formatARS(Number(v))} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill="#C5A059"
            fillOpacity={0.1}
            name="IC 95%"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#C5A059"
            strokeWidth={2}
            dot={false}
            name="Real"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#C5A059"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Proyección"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|forecast-chart" | head -10
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/components/ai/ai-forecast-chart.tsx
git commit -m "feat(F6.G): <AiForecastChart> — gráfico real + proyección con IC95%"
```

---

## Task 31: Componente `<AiChatFloating>`

**Files:**
- Create: `apps/admin/src/components/ai/ai-chat-floating.tsx`

- [ ] **Step 1: Crear el chat flotante con SSE consumer**

Create `apps/admin/src/components/ai/ai-chat-floating.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

export function AiChatFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, contextScope: "global" }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `❌ ${err.error ?? "Error"}` };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          if (!evt.startsWith("data: ")) continue;
          const data = evt.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token") {
              setMessages((m) => {
                const copy = [...m];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + parsed.delta };
                }
                return copy;
              });
            } else if (parsed.type === "done") {
              setSessionId(parsed.sessionId);
            } else if (parsed.type === "error") {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: `❌ ${parsed.message}` };
                return copy;
              });
            }
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-svi-gold text-svi-black shadow-2xl hover:scale-105 transition flex items-center justify-center"
        aria-label="Abrir asistente IA"
        title="Asistente IA"
      >
        {open ? <X className="size-5" /> : <MessageSquare className="size-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] rounded-2xl border border-svi-border-muted bg-svi-card shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-3 border-b border-svi-border-muted">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-svi-white">
              <Sparkles className="size-4 text-svi-gold" />
              Asistente SVI
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-svi-muted hover:text-svi-white"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-svi-muted-2 text-xs py-6">
                Preguntame sobre tus datos: caja, ventas, inversores, agenda, etc.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-svi-gold text-svi-black"
                      : "bg-svi-elevated text-svi-white"
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? "..." : "")}
                </div>
              </div>
            ))}
          </div>

          <footer className="p-3 border-t border-svi-border-muted">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribí tu pregunta…"
                className="flex-1 resize-none rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2 text-sm text-svi-white placeholder:text-svi-muted-2 focus:outline-none focus:ring-1 focus:ring-svi-gold/50 max-h-24"
                disabled={streaming}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={streaming || input.trim().length === 0}
                className="size-10 rounded-lg bg-svi-gold text-svi-black hover:bg-svi-gold/90 disabled:opacity-50 flex items-center justify-center"
                aria-label="Enviar"
              >
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|chat-floating" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/ai/ai-chat-floating.tsx
git commit -m "feat(F6.G): <AiChatFloating> — chat global con SSE streaming"
```

---

## Task 32: Integrar `<AiChatFloating>` en el dashboard layout

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Leer layout actual**

```bash
cat /mnt/d/Proyectos-Dev/svi-erp/apps/admin/src/app/\(dashboard\)/layout.tsx
```

- [ ] **Step 2: Agregar el componente flotante**

Edit `apps/admin/src/app/(dashboard)/layout.tsx`:

Reemplazar la línea `import { Toaster } from "sonner";` con:
```tsx
import { Toaster } from "sonner";
import { AiChatFloating } from "@/components/ai/ai-chat-floating";
```

Y antes de `</div>` que cierra el contenedor principal (después de `<Toaster />`), agregar:
```tsx
<AiChatFloating />
```

El layout debe quedar así (sólo cambios relevantes):

```tsx
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { SUCURSALES_SEED } from "@repo/config/constants";
import { AiChatFloating } from "@/components/ai/ai-chat-floating";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMeta = (user?.app_metadata ?? {}) as { rol?: string };

  const sucursales = SUCURSALES_SEED.map((s, i) => ({
    id: `00000000-0000-0000-0000-00000000001${i}`,
    nombre: s.nombre,
    codigo: s.codigo,
  }));

  return (
    <div className="min-h-screen flex bg-svi-black">
      <Sidebar rol={appMeta.rol} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            email: user?.email ?? "demo@svi.com.ar",
            nombre: user?.user_metadata?.nombre ?? "Demo",
            rol: appMeta.rol ?? "admin",
          }}
          sucursales={sucursales}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
      <Toaster theme="dark" position="top-right" richColors />
      <AiChatFloating />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + lint**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|layout" | head -10 && npm run lint 2>&1 | grep -E "error" | head -10
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(F6.G): integrar <AiChatFloating> en dashboard layout"
```

---

## Task 33: `modules/ai/index.ts` — barrel export controlado

**Files:**
- Create: `apps/admin/src/modules/ai/index.ts`

- [ ] **Step 1: Crear barrel exportando SOLO tipos y funciones server-safe**

Create `apps/admin/src/modules/ai/index.ts`:

```typescript
// Barrel del módulo AI.
// IMPORTANTE: solo exportar TIPOS y SCHEMAS desde acá. Las funciones server-only
// deben importarse directo de su archivo (ej: `from "@/modules/ai/insights"`)
// para evitar mezclar "use server" en client components.

export * from "./schemas";
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run check-types 2>&1 | grep -E "error|modules/ai/index" | head -5
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/modules/ai/index.ts
git commit -m "feat(F6.G): modules/ai/index.ts — barrel sólo de tipos/schemas"
```

---

## Task 34: Verificación end-to-end (smoke tests)

**Files:**
- N/A (validación manual)

- [ ] **Step 1: Asegurar que el dev server arranca sin errores**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp && pkill -f "next dev" 2>/dev/null; sleep 1; npm run dev 2>&1 | tee /tmp/svi-dev.log &
sleep 15
grep -E "error|✓ Ready" /tmp/svi-dev.log | tail -10
```

Expected: línea `✓ Ready in ...ms`. Si hay errores, leerlos y corregir antes de seguir.

- [ ] **Step 2: Verificar build de producción**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run build 2>&1 | tail -30
```

Expected: build exitoso sin errores TS, con output `✓ Compiled successfully` y lista de rutas que incluya `/api/ai/insights`, `/api/ai/categorize`, `/api/ai/anomalies`, `/api/ai/forecast`, `/api/ai/chat`, `/api/ai/analyze`, `/api/ai/report`.

- [ ] **Step 3: Smoke test del endpoint `/api/ai/categorize`**

Necesita una sesión válida. El usuario abre el browser en `http://localhost:3001`, se loguea, copia el cookie de sesión, y desde la terminal:

```bash
COOKIE_HEADER="$(cat /tmp/svi-cookie.txt 2>/dev/null)"
curl -X POST http://localhost:3001/api/ai/categorize \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_HEADER" \
  -d '{
    "moduleKey": "caja",
    "text": "Pago YPF combustible camioneta",
    "candidateCategories": [
      {"value":"gasto_operativo","label":"Gasto operativo"},
      {"value":"compra_vehiculo","label":"Compra vehículo"},
      {"value":"pago_proveedor","label":"Pago proveedor"}
    ]
  }' | head -50
```

Expected: respuesta JSON con `suggested: "gasto_operativo"` y `confidence > 0.7`.

Si no hay cookie disponible (dev fresco), el usuario puede crear un endpoint de testing o saltar este paso y verificar luego en navegador.

- [ ] **Step 4: Smoke test de `/api/ai/insights` con cURL**

```bash
COOKIE_HEADER="$(cat /tmp/svi-cookie.txt 2>/dev/null)"
curl -X POST http://localhost:3001/api/ai/insights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_HEADER" \
  -d '{
    "moduleKey": "caja",
    "scope": "day",
    "fresh": true,
    "contextData": {
      "saldo": 245300,
      "ingresos": 350000,
      "egresos": 104700,
      "topCategorias": [
        {"value":"venta_contado","total":280000},
        {"value":"compra_vehiculo","total":80000}
      ]
    }
  }' | head -100
```

Expected: JSON con campo `insights` array de objetos con `severity`, `title`, `description`.

- [ ] **Step 5: Smoke test del chat flotante en navegador**

1. Abrir `http://localhost:3001/dashboard` en el browser
2. Verificar que aparece el botón flotante con ícono `MessageSquare` en bottom-right
3. Click → se abre el panel de chat
4. Escribir "Hola" + Enter
5. Verificar que aparece respuesta streamed token a token
6. Verificar en Supabase que se creó una sesión en `ai_chat_sessions` y un par de mensajes en `ai_chat_messages`

```bash
psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "SELECT id, user_id, scope, created_at FROM ai_chat_sessions ORDER BY created_at DESC LIMIT 3;"
psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "SELECT role, content, tokens_in, tokens_out FROM ai_chat_messages ORDER BY created_at DESC LIMIT 4;"
```

Expected: sesión creada, mensaje del usuario y respuesta del asistente registrados con tokens contabilizados.

- [ ] **Step 6: Verificar tracking de tokens**

```bash
psql "$(grep DATABASE_URL apps/admin/.env.local | cut -d= -f2- | tr -d '"')" -c "SELECT endpoint, model, tokens_in, tokens_out, cost_usd, created_at FROM ai_token_usage ORDER BY created_at DESC LIMIT 10;"
```

Expected: filas con cada uno de los endpoints probados y costo > 0.

- [ ] **Step 7: Verificar lint final**

```bash
cd /mnt/d/Proyectos-Dev/svi-erp/apps/admin && npm run lint 2>&1 | tail -20
```

Expected: 0 errores. Warnings aceptables si son inocuos (como vars no usadas en archivos test).

- [ ] **Step 8: Detener dev server**

```bash
pkill -f "next dev" 2>/dev/null || true
```

- [ ] **Step 9: Commit de cierre**

```bash
git add -A
git status
git commit -m "feat(F6.G): cierre Bloque G — capa IA transversal verificada end-to-end" --allow-empty
```

---

## Resumen de archivos creados/modificados

**Migrations:**
- `supabase/migrations/0022_ai_chat_sessions.sql`
- `supabase/migrations/0023_ai_token_usage.sql`
- `supabase/migrations/0024_pgvector_embeddings.sql`

**Módulo `apps/admin/src/modules/ai/`:**
- `client.ts`, `cache.ts`, `rate-limit.ts`, `audit.ts`, `redact.ts`, `schemas.ts`, `index.ts`
- `insights.ts`, `anomalies.ts`, `categorize.ts`, `forecast.ts`, `embeddings.ts`, `chat.ts`
- `prompts/system-base.md`, `prompts/caja.md`

**API routes `apps/admin/src/app/api/ai/`:**
- `insights/route.ts`, `categorize/route.ts`, `anomalies/route.ts`, `forecast/route.ts`, `chat/route.ts`, `analyze/route.ts`, `report/route.ts`

**Componentes `apps/admin/src/components/ai/`:**
- `ai-insights-widget.tsx`, `ai-anomaly-badge.tsx`, `ai-suggest-input.tsx`, `ai-narrative-block.tsx`, `ai-forecast-chart.tsx`, `ai-chat-floating.tsx`

**Modificaciones:**
- `apps/admin/package.json` (deps: openai, @upstash/redis, @upstash/ratelimit, recharts)
- `apps/admin/.env.example` (variables IA + Upstash)
- `apps/admin/src/app/(dashboard)/layout.tsx` (montaje del chat flotante)
- `packages/utils/src/auth/permissions.ts` (permisos `ia.*`)

---

## Criterios de aceptación del Bloque G

- [ ] 3 migrations aplicadas sin error: `0022`, `0023`, `0024`
- [ ] Extensión `vector` instalada y función `ai_search_similar` invocable
- [ ] 7 endpoints `/api/ai/*` responden y registran tokens en `ai_token_usage`
- [ ] Rate limiting bloquea correctamente en el request 101 dentro de la misma hora
- [ ] Hard stop por presupuesto devuelve 402 si la empresa supera `AI_MONTHLY_BUDGET_USD`
- [ ] `<AiChatFloating>` montado en topbar funciona con streaming SSE
- [ ] Mensajes de chat se persisten en `ai_chat_sessions` + `ai_chat_messages` con RLS
- [ ] PII sanitizado antes de enviar a OpenAI (probado con un texto que contenga DNI/email)
- [ ] Cache Redis funcionando: segunda llamada con mismos params devuelve `cached: true`
- [ ] Lint y type-check pasan sin errores
- [ ] Build de producción exitoso

---

## Próximo paso después de completar Bloque G

Ejecutar **Bloque A — Dashboard ejecutivo de Caja con IA** (separar en plan propio cuando G esté completo). Reusará todos los componentes y endpoints de G aplicándolos al módulo Caja.
