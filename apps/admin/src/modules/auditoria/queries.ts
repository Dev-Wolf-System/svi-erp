import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { AuditEventRow, AuditFiltros } from "./schemas";

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Cubre [desdeArt 00:00, hastaArt 23:59:59.999] en ART como ISO UTC. */
function rangoArt(desdeArt: string, hastaArt: string): { desde: string; hasta: string } {
  return {
    desde: new Date(`${desdeArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${hastaArt}T23:59:59.999-03:00`).toISOString(),
  };
}

function deriveSemanticAction(
  operacion: string,
  metadata: Record<string, unknown> | null,
): string {
  if (metadata && typeof metadata.action === "string" && metadata.action.length > 0) {
    return metadata.action;
  }
  return operacion.toLowerCase();
}

// ─── API pública ─────────────────────────────────────────────────────────────

export interface AuditLogPagina {
  eventos:    AuditEventRow[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

/**
 * Lista paginada de eventos de auditoría filtrados.
 * Filtra explícitamente por `claims.empresa_id` (la RLS también lo hace,
 * pero filtramos en query para evitar count cross-tenant).
 *
 * Hidrata `usuario_nombre` con una query separada a `usuarios`.
 */
export async function getAuditLog(filtros: AuditFiltros): Promise<AuditLogPagina> {
  const claims = await getSviClaims();
  if (!claims) {
    return {
      eventos: [],
      total: 0,
      page: filtros.page,
      pageSize: filtros.pageSize,
      totalPages: 0,
    };
  }

  const supabase = await createClient();
  const { desde, hasta } = rangoArt(filtros.desde, filtros.hasta);
  const page = Math.max(1, filtros.page);
  const pageSize = Math.max(1, filtros.pageSize);
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  let query = supabase
    .from("audit_log")
    .select(
      "id, empresa_id, tabla, operacion, registro_id, usuario_id, datos_anteriores, datos_nuevos, metadata, ip_address, created_at",
      { count: "exact" },
    )
    .eq("empresa_id", claims.empresa_id)
    .gte("created_at", desde)
    .lte("created_at", hasta);

  if (filtros.tablas && filtros.tablas.length > 0) {
    query = query.in("tabla", filtros.tablas);
  }
  if (filtros.operacion && filtros.operacion !== "TODAS") {
    query = query.eq("operacion", filtros.operacion);
  }
  if (filtros.action && filtros.action.trim().length > 0) {
    // Filtra por metadata->>'action' usando el operador JSON de PostgREST
    query = query.eq("metadata->>action", filtros.action.trim());
  }
  if (filtros.userId) {
    query = query.eq("usuario_id", filtros.userId);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const eventos = (data ?? []) as AuditEventRow[];

  // Hidratar usuario_nombre con una query separada
  const userIds = Array.from(
    new Set(
      eventos
        .map((e) => e.usuario_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  let usuariosMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: userRows } = await supabase
      .from("usuarios")
      .select("id, nombre, apellido")
      .in("id", userIds);

    usuariosMap = new Map(
      ((userRows ?? []) as Array<{ id: string; nombre: string; apellido: string | null }>)
        .map((u) => [
          u.id,
          [u.nombre, u.apellido].filter(Boolean).join(" ").trim() || u.nombre,
        ]),
    );
  }

  // Mapear eventos hidratando nombre + semantic_action
  const eventosHidratados: AuditEventRow[] = eventos.map((e) => ({
    ...e,
    usuario_nombre:  e.usuario_id ? (usuariosMap.get(e.usuario_id) ?? null) : null,
    semantic_action: deriveSemanticAction(e.operacion, e.metadata),
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    eventos:    eventosHidratados,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Devuelve la lista de tablas que tienen al menos un evento auditado en la
 * empresa actual. Útil para poblar el selector "Tablas" en la UI.
 */
export async function getTablasAuditadas(): Promise<string[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("tabla")
    .eq("empresa_id", claims.empresa_id)
    .limit(2000);

  const tablas = Array.from(
    new Set(((data ?? []) as Array<{ tabla: string }>).map((r) => r.tabla)),
  );
  tablas.sort();
  return tablas;
}
