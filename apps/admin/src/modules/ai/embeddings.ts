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
