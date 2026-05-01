"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  leadCreateSchema,
  leadUpdateEstadoSchema,
  leadAsignarSchema,
  type LeadCreateInput,
  type LeadUpdateEstadoInput,
  type LeadAsignarInput,
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

export async function createLead(
  input: LeadCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = leadCreateSchema.safeParse(input);
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
    .from("leads")
    .insert({ ...nullify(parsed.data), empresa_id: claims.empresa_id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/leads");
  return { ok: true, data: { id: data.id } };
}

/** Cambia el estado del lead (drag-and-drop entre columnas). */
export async function updateLeadEstado(
  input: LeadUpdateEstadoInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = leadUpdateEstadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ estado: parsed.data.estado, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/leads");
  return { ok: true, data: { id: parsed.data.id } };
}

export async function asignarVendedor(
  input: LeadAsignarInput,
): Promise<ActionResult> {
  const parsed = leadAsignarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const { assertCan } = await import("@repo/utils");
  try {
    assertCan("leads.assign", claims.rol);
  } catch {
    return { ok: false, error: "Sin permiso para asignar leads" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ vendedor_id: parsed.data.vendedor_id, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/leads");
  return { ok: true, data: null };
}
