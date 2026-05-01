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
