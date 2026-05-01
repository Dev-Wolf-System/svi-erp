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
