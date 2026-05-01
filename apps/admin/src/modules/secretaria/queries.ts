import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { Turno } from "@/modules/agenda/queries";
import type { LeadRow } from "@/modules/leads/queries";

// ─── Tipos propios ────────────────────────────────────────────────────────────

export interface DashboardDiaData {
  turnosProximos: Turno[];
  turnosHoyCount: number;
  pendientesConfirmarCount: number;
  leadsSinAsignarCount: number;
}

export interface VendedorConTurnos {
  recurso_id: string;
  nombre: string;
  color: string;
  turnosHoy: number;
  turnosSemana: number;
  turnos: Turno[];
}

export interface LeadAsignacion {
  sinAsignar: LeadRow[];
  porVendedor: Record<string, LeadRow[]>;
  vendedores: { id: string; nombre: string; color: string }[];
}

// ─── Helper: mapea fila raw de agenda_turnos a Turno ─────────────────────────

function mapTurnoRow(r: Record<string, unknown>): Turno {
  const recurso = Array.isArray(r.recurso)
    ? (r.recurso[0] as { nombre: string; color: string } | undefined)
    : (r.recurso as { nombre: string; color: string } | null | undefined);

  const { recurso: _, ...resto } = r as unknown as Turno & { recurso?: unknown };

  return {
    ...resto,
    recurso_nombre: recurso?.nombre ?? null,
    recurso_color: recurso?.color ?? null,
    persona_label:
      r.persona_tipo === "externo"
        ? ((r.externo_nombre as string | null) ?? "Externo")
        : ((r.persona_tipo as string) ?? null),
  };
}

const TURNO_SELECT = `
  id, empresa_id, recurso_id, persona_tipo, persona_id, externo_nombre,
  externo_telefono, inicio, fin, estado, modalidad, motivo, notas,
  creado_por, external_ref, cancelado_motivo, cancelado_at, cancelado_por, created_at,
  recurso:agenda_recursos!agenda_turnos_recurso_id_fkey ( nombre, color )
`;

// ─── getDashboardDia ──────────────────────────────────────────────────────────

export async function getDashboardDia(): Promise<DashboardDiaData> {
  const claims = await getSviClaims();
  if (!claims) {
    return {
      turnosProximos: [],
      turnosHoyCount: 0,
      pendientesConfirmarCount: 0,
      leadsSinAsignarCount: 0,
    };
  }

  const supabase = await createClient();
  const now = new Date();
  const hoy = now.toISOString().slice(0, 10)!;
  const en3h = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

  const [proximosRes, hoyCountRes, pendientesRes, leadsSARes] = await Promise.all([
    supabase
      .from("agenda_turnos")
      .select(TURNO_SELECT)
      .eq("empresa_id", claims.empresa_id)
      .in("estado", ["solicitado", "confirmado"])
      .gte("inicio", now.toISOString())
      .lte("inicio", en3h)
      .order("inicio")
      .limit(10),

    supabase
      .from("agenda_turnos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", claims.empresa_id)
      .gte("inicio", `${hoy}T00:00:00`)
      .lte("inicio", `${hoy}T23:59:59`),

    supabase
      .from("agenda_turnos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", claims.empresa_id)
      .eq("estado", "solicitado"),

    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", claims.empresa_id)
      .is("vendedor_id", null)
      .not("estado", "in", "(ganado,perdido)"),
  ]);

  return {
    turnosProximos: ((proximosRes.data ?? []) as Record<string, unknown>[]).map(mapTurnoRow),
    turnosHoyCount: hoyCountRes.count ?? 0,
    pendientesConfirmarCount: pendientesRes.count ?? 0,
    leadsSinAsignarCount: leadsSARes.count ?? 0,
  };
}

// ─── getLeadsParaAsignacion ───────────────────────────────────────────────────

export async function getLeadsParaAsignacion(): Promise<LeadAsignacion> {
  const claims = await getSviClaims();
  if (!claims) return { sinAsignar: [], porVendedor: {}, vendedores: [] };

  const supabase = await createClient();

  const [leadsRes, vendedoresRes] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nombre, email, telefono, mensaje, estado, vehiculo_interes, vendedor_id, sucursal_id, origen, created_at, updated_at",
      )
      .eq("empresa_id", claims.empresa_id)
      .not("estado", "in", "(ganado,perdido)")
      .order("updated_at", { ascending: false }),

    supabase
      .from("agenda_recursos")
      .select("id, nombre, color")
      .eq("empresa_id", claims.empresa_id)
      .eq("tipo", "vendedor")
      .eq("activo", true)
      .is("deleted_at", null)
      .order("nombre"),
  ]);

  const leads = (leadsRes.data ?? []) as LeadRow[];
  const vendedores = (vendedoresRes.data ?? []) as { id: string; nombre: string; color: string }[];

  const sinAsignar: LeadRow[] = [];
  const porVendedor: Record<string, LeadRow[]> = {};
  for (const v of vendedores) porVendedor[v.id] = [];

  for (const lead of leads) {
    if (!lead.vendedor_id || !(lead.vendedor_id in porVendedor)) {
      sinAsignar.push(lead);
    } else {
      porVendedor[lead.vendedor_id]!.push(lead);
    }
  }

  return { sinAsignar, porVendedor, vendedores };
}

// ─── getAgendaVendedores ──────────────────────────────────────────────────────

export async function getAgendaVendedores(opts: {
  desde: string;
  hasta: string;
}): Promise<VendedorConTurnos[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10)!;

  const [recursosRes, turnosRes] = await Promise.all([
    supabase
      .from("agenda_recursos")
      .select("id, nombre, color")
      .eq("empresa_id", claims.empresa_id)
      .eq("tipo", "vendedor")
      .eq("activo", true)
      .is("deleted_at", null)
      .order("nombre"),

    supabase
      .from("agenda_turnos")
      .select(TURNO_SELECT)
      .eq("empresa_id", claims.empresa_id)
      .gte("inicio", opts.desde)
      .lt("inicio", opts.hasta)
      .order("inicio"),
  ]);

  const vendedores = (recursosRes.data ?? []) as {
    id: string;
    nombre: string;
    color: string;
  }[];
  const todasFilas = (turnosRes.data ?? []) as Record<string, unknown>[];

  return vendedores.map((v) => {
    const turnos = todasFilas
      .filter((r) => r.recurso_id === v.id)
      .map(mapTurnoRow);

    const turnosHoy = turnos.filter(
      (t) =>
        t.inicio >= `${hoy}T00:00:00` && t.inicio <= `${hoy}T23:59:59`,
    ).length;

    return {
      recurso_id: v.id,
      nombre: v.nombre,
      color: v.color,
      turnosHoy,
      turnosSemana: turnos.length,
      turnos,
    };
  });
}
