"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bancoCreateSchema,
  bancoUpdateSchema,
  type BancoCreateInput,
  type BancoUpdateInput,
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

export async function createBanco(
  input: BancoCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = bancoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const empresaId = (user.app_metadata as { empresa_id?: string }).empresa_id;
  if (!empresaId) return { ok: false, error: "Sin empresa_id en JWT (revisar hook)" };

  const { data, error } = await supabase
    .from("bancos")
    .insert({ ...nullify(parsed.data), empresa_id: empresaId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/bancos");
  return { ok: true, data: { id: data.id } };
}

export async function updateBanco(
  input: BancoUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = bancoUpdateSchema.safeParse(input);
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
    .from("bancos")
    .update({ ...nullify(patch), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/bancos");
  revalidatePath(`/bancos/${id}`);
  return { ok: true, data: { id } };
}

/**
 * Bancos no se borran (pueden estar referenciados por ventas históricas).
 * En su lugar se desactivan: dejan de aparecer en el wizard de venta pero
 * el dato sigue vivo para los reportes.
 */
export async function toggleBancoActivo(
  id: string,
  activo: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bancos")
    .update({ activo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/bancos");
  revalidatePath(`/bancos/${id}`);
  return { ok: true, data: null };
}
