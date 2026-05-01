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
