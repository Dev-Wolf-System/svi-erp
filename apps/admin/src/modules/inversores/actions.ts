"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  inversorCreateSchema,
  inversorUpdateSchema,
  type InversorCreateInput,
  type InversorUpdateInput,
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

export async function createInversor(
  input: InversorCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = inversorCreateSchema.safeParse(input);
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
  const { data, error } = await supabase
    .from("inversores")
    .insert({ ...nullify(parsed.data), empresa_id: claims.empresa_id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversores");
  return { ok: true, data: { id: data.id } };
}

export async function updateInversor(
  input: InversorUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = inversorUpdateSchema.safeParse(input);
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
    .from("inversores")
    .update({ ...nullify(patch), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversores");
  revalidatePath(`/inversores/${id}`);
  return { ok: true, data: { id } };
}

export async function softDeleteInversor(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("inversiones")
    .select("id", { count: "exact", head: true })
    .eq("inversor_id", id)
    .eq("estado", "activa")
    .is("deleted_at", null);

  if (count && count > 0) {
    return {
      ok: false,
      error: `Tiene ${count} inversión(es) activa(s). Cancelarlas primero.`,
    };
  }

  const { error } = await supabase
    .from("inversores")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversores");
  return { ok: true, data: null };
}

export async function togglePortalInversor(
  id: string,
  activo: boolean,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inversores")
    .update({ portal_activo: activo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inversores");
  revalidatePath(`/inversores/${id}`);
  return { ok: true, data: { id } };
}
