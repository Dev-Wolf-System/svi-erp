"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  vehiculoCreateSchema,
  vehiculoUpdateSchema,
  type VehiculoCreateInput,
  type VehiculoUpdateInput,
} from "./schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Crea un vehículo. RLS valida empresa_id desde el JWT. */
export async function createVehiculo(input: VehiculoCreateInput): Promise<ActionResult<{ id: string }>> {
  const parsed = vehiculoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const empresaId = (user.app_metadata as { empresa_id?: string }).empresa_id;
  if (!empresaId) return { ok: false, error: "Sin empresa_id en JWT (revisar hook)" };

  const { data, error } = await supabase
    .from("vehiculos")
    .insert({
      ...parsed.data,
      empresa_id: empresaId,
      ingresado_por: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/stock");
  return { ok: true, data: { id: data.id } };
}

export async function updateVehiculo(input: VehiculoUpdateInput): Promise<ActionResult<{ id: string }>> {
  const parsed = vehiculoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { id, ...patch } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehiculos")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
  return { ok: true, data: { id } };
}

/** Soft delete — marca deleted_at, NUNCA borra fila. */
export async function softDeleteVehiculo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehiculos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/stock");
  return { ok: true, data: null };
}
