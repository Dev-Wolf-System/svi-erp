"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  ventaCreateSchema,
  ventaCambioEstadoSchema,
  ventaAnularSchema,
  type VentaCreateInput,
  type VentaCambioEstadoInput,
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
 * Crea una venta en estado 'reserva'. El número de operación se genera
 * con la función SQL `generar_numero_operacion` (atómica, sin races).
 *
 * El vehículo NO se marca como vendido aquí — sigue en estado 'reservado'
 * hasta que la venta avance a 'aprobado' o 'entregado'.
 */
export async function createVenta(
  input: VentaCreateInput,
): Promise<ActionResult<{ id: string; numero_operacion: string }>> {
  const parsed = ventaCreateSchema.safeParse(input);
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
  const { data: sucursal, error: sucErr } = await supabase
    .from("sucursales")
    .select("codigo")
    .eq("id", parsed.data.sucursal_id)
    .single();
  if (sucErr || !sucursal) {
    return { ok: false, error: "Sucursal no encontrada" };
  }

  const { data: numeroData, error: rpcErr } = await supabase.rpc(
    "generar_numero_operacion",
    {
      p_empresa_id: claims.empresa_id,
      p_tipo: "venta",
      p_codigo_sucursal: sucursal.codigo,
    },
  );
  if (rpcErr || !numeroData) {
    return { ok: false, error: `Numeración: ${rpcErr?.message ?? "fallida"}` };
  }

  const { data, error } = await supabase
    .from("ventas")
    .insert({
      ...nullify(parsed.data),
      empresa_id: claims.empresa_id,
      numero_operacion: numeroData as string,
      estado: "reserva",
    })
    .select("id, numero_operacion")
    .single();

  if (error) return { ok: false, error: error.message };

  // Reservar el vehículo (24hs default). El cron de 0011 libera reservas vencidas.
  await supabase
    .from("vehiculos")
    .update({
      estado: "reservado",
      reservado_hasta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", parsed.data.vehiculo_id);

  revalidatePath("/ventas");
  revalidatePath("/stock");
  return {
    ok: true,
    data: { id: data.id, numero_operacion: data.numero_operacion },
  };
}

/**
 * Avanza el estado de una venta. Reglas mínimas:
 *   - 'entregado' marca el vehículo como vendido.
 *   - 'anulado' libera el vehículo (vuelve a stock) — pero usar `anularVenta`
 *     para registrar el motivo, no este endpoint genérico.
 */
export async function cambiarEstadoVenta(
  input: VentaCambioEstadoInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ventaCambioEstadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { id, estado } = parsed.data;

  const { data: venta, error: fetchErr } = await supabase
    .from("ventas")
    .select("vehiculo_id, estado")
    .eq("id", id)
    .single();
  if (fetchErr || !venta) return { ok: false, error: "Venta no encontrada" };

  const { error } = await supabase
    .from("ventas")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (estado === "entregado" || estado === "finalizado") {
    await supabase
      .from("vehiculos")
      .update({ estado: "vendido", reservado_hasta: null })
      .eq("id", venta.vehiculo_id);
  }

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/stock");
  return { ok: true, data: { id } };
}

/**
 * Anula una venta y libera el vehículo (vuelve a stock).
 * No se puede anular si el CAE ya fue emitido (legalmente requiere NC).
 */
export async function anularVenta(
  input: { id: string; motivo: string },
): Promise<ActionResult<{ id: string }>> {
  const parsed = ventaAnularSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Motivo requerido (mínimo 3 caracteres)" };

  const supabase = await createClient();
  const { id, motivo } = parsed.data;

  const { data: venta, error: fetchErr } = await supabase
    .from("ventas")
    .select("vehiculo_id, cae, estado, notas")
    .eq("id", id)
    .single();
  if (fetchErr || !venta) return { ok: false, error: "Venta no encontrada" };

  if (venta.cae) {
    return {
      ok: false,
      error: "Esta venta tiene CAE emitido. Generar Nota de Crédito en lugar de anular.",
    };
  }

  const notasActualizadas = [
    venta.notas?.trim(),
    `[ANULADA ${new Date().toISOString().slice(0, 10)}] ${motivo}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase
    .from("ventas")
    .update({
      estado: "anulado",
      notas: notasActualizadas,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("vehiculos")
    .update({ estado: "stock", reservado_hasta: null })
    .eq("id", venta.vehiculo_id);

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/stock");
  return { ok: true, data: { id } };
}
