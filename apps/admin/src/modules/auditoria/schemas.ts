import { z } from "zod";

// ─── Tipos de salida ─────────────────────────────────────────────────────────

/** Operaciones soportadas en audit_log:
 *  - INSERT/UPDATE/DELETE  → capturadas automáticamente por trg_audit_log()
 *  - EVENT                 → eventos semánticos manuales vía fn_audit_log_event()
 */
export const AUDIT_OPERACIONES = ["INSERT", "UPDATE", "DELETE", "EVENT"] as const;
export type AuditOperacion = (typeof AUDIT_OPERACIONES)[number];

export interface AuditEventRow {
  id:                string;
  empresa_id:        string;
  tabla:             string;
  operacion:         string;       // 'INSERT' | 'UPDATE' | 'DELETE' | 'EVENT'
  registro_id:       string | null;
  usuario_id:        string | null;
  datos_anteriores:  unknown;
  datos_nuevos:      unknown;
  metadata:          Record<string, unknown> | null;
  ip_address:        string | null;
  created_at:        string;
  // Hidratado client-side desde tabla usuarios:
  usuario_nombre?:   string | null;
  /** Acción semántica para mostrar en UI:
   *  - Si metadata.action existe → ese valor
   *  - Sino → operacion (INSERT/UPDATE/DELETE) en lowercase */
  semantic_action?:  string;
}

// ─── Schemas de filtros ──────────────────────────────────────────────────────

export const auditFiltrosSchema = z.object({
  desde:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tablas:    z.array(z.string()).optional(),
  operacion: z.enum(["INSERT", "UPDATE", "DELETE", "EVENT", "TODAS"]).default("TODAS"),
  action:    z.string().optional(),       // filtra por metadata->>'action'
  userId:    z.string().uuid().optional(),
  page:      z.number().int().min(1).default(1),
  pageSize:  z.number().int().min(10).max(100).default(50),
});
export type AuditFiltros = z.infer<typeof auditFiltrosSchema>;
