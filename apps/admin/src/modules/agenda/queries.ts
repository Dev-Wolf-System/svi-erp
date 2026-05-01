import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type {
  Recurso,
  DisponibilidadFranja,
  Bloqueo,
  Turno,
  TurnoEstado,
  PersonaTipo,
} from "./schemas";

export type { Recurso, DisponibilidadFranja, Bloqueo, Turno };

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getRecursos(opts?: {
  soloActivos?: boolean;
}): Promise<Recurso[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();
  let q = supabase
    .from("agenda_recursos")
    .select(
      "id, empresa_id, sucursal_id, tipo, nombre, usuario_id, color, activo, notas",
    )
    .eq("empresa_id", claims.empresa_id)
    .is("deleted_at", null)
    .order("nombre");

  if (opts?.soloActivos) q = q.eq("activo", true);

  const { data, error } = await q;
  if (error) {
    console.error("[getRecursos]", error.message);
    return [];
  }
  return (data ?? []) as Recurso[];
}

export async function getRecursoById(id: string): Promise<Recurso | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_recursos")
    .select(
      "id, empresa_id, sucursal_id, tipo, nombre, usuario_id, color, activo, notas",
    )
    .eq("id", id)
    .eq("empresa_id", claims.empresa_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getRecursoById]", error.message);
    return null;
  }
  return data as Recurso | null;
}

export async function getDisponibilidadDelRecurso(
  recursoId: string,
): Promise<DisponibilidadFranja[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_disponibilidad")
    .select(
      "id, recurso_id, dia_semana, hora_inicio, hora_fin, slot_minutos, vigente_desde, vigente_hasta",
    )
    .eq("recurso_id", recursoId)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error("[getDisponibilidadDelRecurso]", error.message);
    return [];
  }
  return (data ?? []) as DisponibilidadFranja[];
}

export async function getBloqueosDelRecurso(
  recursoId: string,
  rango?: { desde: string; hasta: string },
): Promise<Bloqueo[]> {
  const supabase = await createClient();
  let q = supabase
    .from("agenda_bloqueos")
    .select("id, recurso_id, desde, hasta, motivo")
    .eq("recurso_id", recursoId);

  if (rango) {
    q = q.gte("hasta", rango.desde).lte("desde", rango.hasta);
  }

  const { data, error } = await q.order("desde");
  if (error) {
    console.error("[getBloqueosDelRecurso]", error.message);
    return [];
  }
  return (data ?? []) as Bloqueo[];
}

/**
 * Lista de turnos en un rango. Hidratado con datos del recurso y un label
 * legible de la persona (cliente.razon/nombre · inversor.nombre · lead · externo).
 */
export async function getTurnosRango(filters: {
  desde: string;
  hasta: string;
  recurso_id?: string;
  estado?: TurnoEstado;
}): Promise<Turno[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();
  let q = supabase
    .from("agenda_turnos")
    .select(
      `
      id, empresa_id, recurso_id, persona_tipo, persona_id, externo_nombre,
      externo_telefono, inicio, fin, estado, modalidad, motivo, notas,
      creado_por, external_ref, cancelado_motivo, cancelado_at, cancelado_por,
      created_at,
      recurso:agenda_recursos!agenda_turnos_recurso_id_fkey ( nombre, color )
      `,
    )
    .eq("empresa_id", claims.empresa_id)
    .gte("inicio", filters.desde)
    .lt("inicio", filters.hasta)
    .order("inicio");

  if (filters.recurso_id) q = q.eq("recurso_id", filters.recurso_id);
  if (filters.estado) q = q.eq("estado", filters.estado);

  const { data, error } = await q;
  if (error) {
    console.error("[getTurnosRango]", error.message);
    return [];
  }

  type Row = Turno & {
    recurso?: { nombre: string; color: string } | { nombre: string; color: string }[] | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  // Hidratar persona_label en N+1 controlado: agrupar por tipo, batch por tipo.
  const byTipo: Record<PersonaTipo, string[]> = {
    cliente: [],
    inversor: [],
    lead: [],
    externo: [],
  };
  for (const r of rows) {
    if (r.persona_id) byTipo[r.persona_tipo].push(r.persona_id);
  }

  const labelMap = new Map<string, string>();

  if (byTipo.cliente.length > 0) {
    const { data: cs } = await supabase
      .from("clientes")
      .select("id, tipo, razon_social, nombre, apellido")
      .in("id", byTipo.cliente);
    for (const c of cs ?? []) {
      const label =
        c.tipo === "empresa"
          ? (c.razon_social ?? "Cliente empresa")
          : `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || "Cliente";
      labelMap.set(`cliente:${c.id}`, label);
    }
  }
  if (byTipo.inversor.length > 0) {
    const { data: ivs } = await supabase
      .from("inversores")
      .select("id, nombre")
      .in("id", byTipo.inversor);
    for (const i of ivs ?? []) {
      labelMap.set(`inversor:${i.id}`, i.nombre);
    }
  }
  if (byTipo.lead.length > 0) {
    const { data: ls } = await supabase
      .from("leads")
      .select("id, nombre, telefono")
      .in("id", byTipo.lead);
    for (const l of ls ?? []) {
      labelMap.set(`lead:${l.id}`, l.nombre || l.telefono || "Lead");
    }
  }

  return rows.map((r) => {
    const recurso = Array.isArray(r.recurso) ? r.recurso[0] : r.recurso;
    let persona_label: string | null;
    if (r.persona_tipo === "externo") {
      persona_label = r.externo_nombre || "Externo";
    } else if (r.persona_id) {
      persona_label =
        labelMap.get(`${r.persona_tipo}:${r.persona_id}`) ?? r.persona_tipo;
    } else {
      persona_label = null;
    }
    return {
      ...r,
      recurso_nombre: recurso?.nombre ?? null,
      recurso_color: recurso?.color ?? null,
      persona_label,
      recurso: undefined,
    } as Turno;
  });
}

/**
 * Slots libres de un recurso en una fecha dada, considerando:
 *   - franjas de disponibilidad recurrente (dia_semana de la fecha)
 *   - bloqueos puntuales que tocan la fecha
 *   - turnos vivos (solicitado/confirmado) ocupando slots
 *
 * Devuelve array ordenado de slots `{ inicio, fin }` libres en ISO string.
 */
export async function getSlotsLibres(input: {
  recurso_id: string;
  fecha: string; // YYYY-MM-DD
}): Promise<{ inicio: string; fin: string }[]> {
  const supabase = await createClient();
  const claims = await getSviClaims();
  if (!claims) return [];

  // 1. Recurso (validar empresa + obtener datos)
  const recurso = await getRecursoById(input.recurso_id);
  if (!recurso || !recurso.activo) return [];

  // 2. Día de semana (0..6 con domingo=0)
  const fecha = new Date(`${input.fecha}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return [];
  const dia_semana = fecha.getDay();

  // 3. Disponibilidad del día
  const { data: dispos } = await supabase
    .from("agenda_disponibilidad")
    .select("hora_inicio, hora_fin, slot_minutos, vigente_desde, vigente_hasta")
    .eq("recurso_id", input.recurso_id)
    .eq("dia_semana", dia_semana);

  const franjasVigentes = (dispos ?? []).filter((d) => {
    const fechaIso = input.fecha;
    if (d.vigente_desde && fechaIso < d.vigente_desde) return false;
    if (d.vigente_hasta && fechaIso > d.vigente_hasta) return false;
    return true;
  });
  if (franjasVigentes.length === 0) return [];

  // 4. Bloqueos que tocan la fecha
  const inicioDia = `${input.fecha}T00:00:00`;
  const finDia = `${input.fecha}T23:59:59`;
  const bloqueos = await getBloqueosDelRecurso(input.recurso_id, {
    desde: inicioDia,
    hasta: finDia,
  });

  // 5. Turnos vivos del día
  const turnos = await getTurnosRango({
    desde: inicioDia,
    hasta: finDia,
    recurso_id: input.recurso_id,
  });
  const turnosVivos = turnos.filter(
    (t) => t.estado === "solicitado" || t.estado === "confirmado",
  );

  // 6. Generar slots por franja y filtrar bloqueos/turnos
  const slots: { inicio: string; fin: string }[] = [];
  for (const franja of franjasVigentes) {
    const slotMin = franja.slot_minutos;
    const [hi, mi] = franja.hora_inicio.split(":").map(Number);
    const [hf, mf] = franja.hora_fin.split(":").map(Number);
    const startTotal = (hi ?? 0) * 60 + (mi ?? 0);
    const endTotal = (hf ?? 0) * 60 + (mf ?? 0);

    for (let t = startTotal; t + slotMin <= endTotal; t += slotMin) {
      const slotInicio = makeIso(input.fecha, t);
      const slotFin = makeIso(input.fecha, t + slotMin);

      const overlap =
        bloqueos.some((b) => rangesOverlap(slotInicio, slotFin, b.desde, b.hasta)) ||
        turnosVivos.some((t) => rangesOverlap(slotInicio, slotFin, t.inicio, t.fin));

      if (!overlap) slots.push({ inicio: slotInicio, fin: slotFin });
    }
  }
  return slots;
}

function makeIso(fechaYMD: string, minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${fechaYMD}T${pad(h)}:${pad(m)}:00`;
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function rangesOverlap(a1: string, a2: string, b1: string, b2: string): boolean {
  const A1 = new Date(a1).getTime();
  const A2 = new Date(a2).getTime();
  const B1 = new Date(b1).getTime();
  const B2 = new Date(b2).getTime();
  return A1 < B2 && B1 < A2;
}
