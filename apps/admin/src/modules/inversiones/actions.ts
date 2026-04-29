"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  inversionCreateSchema,
  inversionUpdateSchema,
  inversionCambioTasaSchema,
  inversionCambioEstadoSchema,
  type InversionCreateInput,
  type InversionUpdateInput,
  type InversionCambioTasaInput,
  type InversionCambioEstadoInput,
} from "./schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function nullify<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = { ...input };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out as T;
}

/**
 * Crea una inversión con numero_contrato atómico (RPC generar_numero_operacion
 * con tipo='inversion'). Inicializa capital_actual = capital_inicial.
 *
 * El estado_regulatorio default 'pre_dictamen' marca la operación bajo el
 * régimen flex-first (ADR 0007) hasta que el dictamen legal esté.
 */
export async function createInversion(
  input: InversionCreateInput,
): Promise<ActionResult<{ id: string; numero_contrato: string }>> {
  const parsed = inversionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado o sin claims SVI en el JWT" };

  const supabase = await createClient();

  // Obtener código de sucursal para la numeración (si no se pasó, usar la principal o la primera del JWT)
  const sucursalId =
    parsed.data.sucursal_id ??
    claims.es_principal_sucursal ??
    claims.sucursales?.[0];
  if (!sucursalId) {
    return { ok: false, error: "Seleccioná una sucursal o asociá una al usuario." };
  }

  const { data: sucursal, error: sucErr } = await supabase
    .from("sucursales")
    .select("codigo")
    .eq("id", sucursalId)
    .single();
  if (sucErr || !sucursal) {
    return { ok: false, error: "Sucursal no encontrada" };
  }

  const { data: numeroData, error: rpcErr } = await supabase.rpc(
    "generar_numero_operacion",
    {
      p_empresa_id: claims.empresa_id,
      p_tipo: "inversion",
      p_codigo_sucursal: sucursal.codigo,
    },
  );
  if (rpcErr || !numeroData) {
    return { ok: false, error: `Numeración: ${rpcErr?.message ?? "fallida"}` };
  }

  const { data, error } = await supabase
    .from("inversiones")
    .insert({
      ...nullify(parsed.data),
      sucursal_id: sucursalId,
      empresa_id: claims.empresa_id,
      numero_contrato: numeroData as string,
      capital_actual: parsed.data.capital_inicial,
    })
    .select("id, numero_contrato")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversiones");
  return { ok: true, data: { id: data.id, numero_contrato: data.numero_contrato } };
}

export async function updateInversion(
  input: InversionUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = inversionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { id, ...patch } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("inversiones")
    .update({ ...nullify(patch), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversiones");
  revalidatePath(`/inversiones/${id}`);
  return { ok: true, data: { id } };
}

/**
 * Cambia la tasa mensual. El trigger inversion_tasa_audit registra
 * automáticamente la transición tasa_anterior → tasa_nueva en
 * inversion_tasa_historial. Para registrar el motivo, hacemos el UPDATE
 * de la tasa primero (lo que dispara el INSERT del trigger) y después
 * actualizamos el último registro del historial con el motivo.
 *
 * Decisión: el trigger no recibe el motivo desde la app — sumarle un GUC
 * (SET LOCAL motivo='...') sería frágil. Mejor: parchear el último row
 * del historial inmediatamente después.
 */
export async function cambiarTasaInversion(
  input: InversionCambioTasaInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = inversionCambioTasaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const { id, tasa_nueva, motivo } = parsed.data;
  const supabase = await createClient();

  const { data: inv, error: fetchErr } = await supabase
    .from("inversiones")
    .select("tasa_mensual, estado")
    .eq("id", id)
    .single();
  if (fetchErr || !inv) return { ok: false, error: "Inversión no encontrada" };

  if (inv.estado === "finalizada") {
    return { ok: false, error: "No se puede cambiar la tasa de una inversión finalizada" };
  }
  if (Number(inv.tasa_mensual) === tasa_nueva) {
    return { ok: false, error: "La nueva tasa es igual a la actual" };
  }

  const { error: updErr } = await supabase
    .from("inversiones")
    .update({ tasa_mensual: tasa_nueva, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };

  // El trigger ya creó el row del historial — buscamos el más reciente para anotar el motivo.
  const { data: ultimoHistorial } = await supabase
    .from("inversion_tasa_historial")
    .select("id")
    .eq("inversion_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultimoHistorial?.id) {
    await supabase
      .from("inversion_tasa_historial")
      .update({ motivo })
      .eq("id", ultimoHistorial.id);
  }

  revalidatePath("/inversiones");
  revalidatePath(`/inversiones/${id}`);
  return { ok: true, data: { id } };
}

export async function cambiarEstadoInversion(
  input: InversionCambioEstadoInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = inversionCambioEstadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const { id, estado } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("inversiones")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversiones");
  revalidatePath(`/inversiones/${id}`);
  return { ok: true, data: { id } };
}

export async function softDeleteInversion(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("liquidaciones_inversion")
    .select("id", { count: "exact", head: true })
    .eq("inversion_id", id)
    .eq("estado", "pagada");

  if (count && count > 0) {
    return {
      ok: false,
      error: `Tiene ${count} liquidación(es) pagada(s). Una inversión con historial de pagos no puede borrarse — finalizarla en su lugar.`,
    };
  }

  const { error } = await supabase
    .from("inversiones")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversiones");
  return { ok: true, data: null };
}
