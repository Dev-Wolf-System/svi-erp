"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  clienteCreateSchema,
  clienteUpdateSchema,
  type ClienteCreateInput,
  type ClienteUpdateInput,
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

export async function createCliente(
  input: ClienteCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteCreateSchema.safeParse(input);
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
    .from("clientes")
    .insert({ ...nullify(parsed.data), empresa_id: claims.empresa_id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, data: { id: data.id } };
}

export async function updateCliente(
  input: ClienteUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteUpdateSchema.safeParse(input);
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
    .from("clientes")
    .update({ ...nullify(patch), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, data: { id } };
}

export async function softDeleteCliente(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, data: null };
}
