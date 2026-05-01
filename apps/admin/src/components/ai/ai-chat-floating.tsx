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
