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
          const usage = (chunk as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
          if (usage) {
            totalTokensIn = usage.prompt_tokens ?? 0;
            totalTokensOut = usage.completion_tokens ?? 0;
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
