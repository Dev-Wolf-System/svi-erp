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
