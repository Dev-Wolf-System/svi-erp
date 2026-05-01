"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import {
  recursoCreateSchema,
  recursoUpdateSchema,
  disponibilidadCreateSchema,
  bloqueoCreateSchema,
  turnoCreateSchema,
  turnoUpdateEstadoSchema,
  turnoReprogramarSchema,
  turnoReasignarRecursoSchema,
  type RecursoCreateInput,
  type RecursoUpdateInput,
  type DisponibilidadCreateInput,
  type BloqueoCreateInput,
  type TurnoCreateInput,
  type TurnoUpdateEstadoInput,
  type TurnoReprogramarInput,
  type TurnoReasignarRecursoInput,
} from "./schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenZod(err: { issues: Array<{ path: (string | number)[]; message: string }> }) {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of err.issues) {
    const key = i.path.join(".") || "_form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), i.message];
  }
  return fieldErrors;
}

// ─── Recursos ───────────────────────────────────────────────────────────────

export async function crearRecurso(
  input: RecursoCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = recursoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_recursos")
    .insert({
      empresa_id: claims.empresa_id,
      tipo: parsed.data.tipo,
      nombre: parsed.data.nombre,
      sucursal_id: parsed.data.sucursal_id ?? null,
      usuario_id: parsed.data.usuario_id ?? null,
      color: parsed.data.color,
      activo: parsed.data.activo,
      notas: parsed.data.notas ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  revalidatePath("/agenda/recursos");
  return { ok: true, data: { id: data.id } };
}

export async function actualizarRecurso(
  input: RecursoUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = recursoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const supabase = await createClient();
  const { id, ...rest } = parsed.data;

  const { error } = await supabase
    .from("agenda_recursos")
    .update({ ...rest })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  revalidatePath(`/agenda/recursos/${id}`);
  return { ok: true, data: { id } };
}

export async function softDeleteRecurso(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_recursos")
    .update({ deleted_at: new Date().toISOString(), activo: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda/recursos");
  return { ok: true, data: { id } };
}

// ─── Disponibilidad ─────────────────────────────────────────────────────────

export async function crearDisponibilidad(
  input: DisponibilidadCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = disponibilidadCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_disponibilidad")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/agenda/recursos/${parsed.data.recurso_id}`);
  return { ok: true, data: { id: data.id } };
}

export async function eliminarDisponibilidad(
  id: string,
  recursoId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_disponibilidad").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/agenda/recursos/${recursoId}`);
  return { ok: true, data: { id } };
}

// ─── Bloqueos ───────────────────────────────────────────────────────────────

export async function crearBloqueo(
  input: BloqueoCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = bloqueoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_bloqueos")
    .insert({
      recurso_id: parsed.data.recurso_id,
      desde: parsed.data.desde,
      hasta: parsed.data.hasta,
      motivo: parsed.data.motivo ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  revalidatePath(`/agenda/recursos/${parsed.data.recurso_id}`);
  return { ok: true, data: { id: data.id } };
}

export async function eliminarBloqueo(
  id: string,
  recursoId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_bloqueos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  revalidatePath(`/agenda/recursos/${recursoId}`);
  return { ok: true, data: { id } };
}

// ─── Turnos ─────────────────────────────────────────────────────────────────

export async function crearTurno(
  input: TurnoCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = turnoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_turnos")
    .insert({
      empresa_id: claims.empresa_id,
      recurso_id: parsed.data.recurso_id,
      persona_tipo: parsed.data.persona_tipo,
      persona_id: parsed.data.persona_id ?? null,
      externo_nombre: parsed.data.externo_nombre ?? null,
      externo_telefono: parsed.data.externo_telefono ?? null,
      inicio: parsed.data.inicio,
      fin: parsed.data.fin,
      modalidad: parsed.data.modalidad,
      motivo: parsed.data.motivo,
      notas: parsed.data.notas ?? null,
      external_ref: parsed.data.external_ref ?? null,
      creado_por: `usuario:${claims.sub}`,
      estado: "solicitado",
    })
    .select("id")
    .single();

  if (error) {
    // El EXCLUDE constraint da código '23P01' (exclusion_violation)
    if (error.code === "23P01") {
      return {
        ok: false,
        error:
          "El recurso ya tiene un turno solicitado/confirmado en ese horario. Elegí otro.",
      };
    }
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un turno con ese external_ref." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/agenda");
  return { ok: true, data: { id: data.id } };
}

export async function cambiarEstadoTurno(
  input: TurnoUpdateEstadoInput,
): Promise<ActionResult<{ id: string; estado: string }>> {
  const parsed = turnoUpdateEstadoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();
  const update: Record<string, unknown> = { estado: parsed.data.estado };

  if (parsed.data.estado === "cancelado") {
    update.cancelado_at = new Date().toISOString();
    update.cancelado_por = `usuario:${claims.sub}`;
    update.cancelado_motivo = parsed.data.cancelado_motivo ?? null;
  }

  const { error } = await supabase
    .from("agenda_turnos")
    .update(update)
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true, data: { id: parsed.data.id, estado: parsed.data.estado } };
}

export async function reprogramarTurno(
  input: TurnoReprogramarInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = turnoReprogramarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: flattenZod(parsed.error) };
  }

  const supabase = await createClient();

  // Append motivo de reprogramación a las notas (audit trail liviano).
  let motivoSuffix = "";
  if (parsed.data.motivo_reprogramacion?.trim()) {
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    motivoSuffix = `\n[reprogramado ${ts}] ${parsed.data.motivo_reprogramacion.trim()}`;
  }

  const { data: actual, error: fetchErr } = await supabase
    .from("agenda_turnos")
    .select("notas")
    .eq("id", parsed.data.id)
    .single();
  if (fetchErr) return { ok: false, error: fetchErr.message };

  const { error } = await supabase
    .from("agenda_turnos")
    .update({
      inicio: parsed.data.inicio,
      fin: parsed.data.fin,
      notas: `${actual.notas ?? ""}${motivoSuffix}`.trim() || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "El nuevo horario choca con otro turno solicitado/confirmado.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/agenda");
  return { ok: true, data: { id: parsed.data.id } };
}

export async function reasignarRecursoTurno(
  input: TurnoReasignarRecursoInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = turnoReasignarRecursoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("agenda.gestionar_turno", claims.rol)) {
    return { ok: false, error: "Sin permisos para reasignar turnos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_turnos")
    .update({ recurso_id: parsed.data.recurso_id })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23P01") {
      return { ok: false, error: "El nuevo recurso ya tiene un turno activo en ese horario." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/agenda");
  return { ok: true, data: { id: parsed.data.id } };
}
