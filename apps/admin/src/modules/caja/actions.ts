"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import {
  movimientoCreateSchema,
  cierreCreateSchema,
  type MovimientoCreateInput,
  type CierreCreateInput,
} from "./schemas";
import { getMovimientosDia, artFecha } from "./queries";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function registrarMovimiento(
  input: MovimientoCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = movimientoCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("caja.registrar", claims.rol)) {
    return { ok: false, error: "Sin permisos para registrar movimientos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos_caja")
    .insert({
      empresa_id:      claims.empresa_id,
      sucursal_id:     parsed.data.sucursal_id,
      tipo:            parsed.data.tipo,
      categoria:       parsed.data.categoria,
      concepto:        parsed.data.concepto,
      monto:           parsed.data.monto,
      moneda:          parsed.data.moneda,
      fecha_operacion: parsed.data.fecha_operacion ?? new Date().toISOString(),
      registrado_por:  claims.sub,
      comprobante_url: parsed.data.comprobante_url ?? null,
      ref_tipo:        parsed.data.ref_tipo ?? null,
      ref_id:          parsed.data.ref_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/caja");
  return { ok: true, data: { id: data.id } };
}

export async function anularMovimiento(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("caja.registrar", claims.rol)) {
    return { ok: false, error: "Sin permisos para anular movimientos" };
  }

  const supabase = await createClient();

  // No permitir anular si ya tiene cierre
  const { data: mov } = await supabase
    .from("movimientos_caja")
    .select("cierre_id")
    .eq("id", id)
    .single();

  if (mov?.cierre_id) {
    return { ok: false, error: "El movimiento pertenece a un cierre cerrado y no puede anularse" };
  }

  const { error } = await supabase
    .from("movimientos_caja")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/caja");
  return { ok: true, data: { id } };
}

export async function cerrarCaja(
  input: CierreCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = cierreCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("caja.cerrar", claims.rol)) {
    return { ok: false, error: "Sin permisos para cerrar la caja" };
  }

  // Calcular totales server-side desde los movimientos del día
  const movimientos = await getMovimientosDia(parsed.data.sucursal_id, parsed.data.fecha);
  let totalIngresos = 0;
  let totalEgresos = 0;
  for (const m of movimientos) {
    if (m.moneda !== "ARS") continue;
    if (m.tipo === "ingreso") totalIngresos += Number(m.monto);
    else totalEgresos += Number(m.monto);
  }

  const supabase = await createClient();

  // INSERT cierre (UNIQUE(sucursal_id, fecha) previene doble cierre)
  const { data: cierre, error: errCierre } = await supabase
    .from("cierres_caja")
    .insert({
      empresa_id:     claims.empresa_id,
      sucursal_id:    parsed.data.sucursal_id,
      fecha:          parsed.data.fecha,
      total_ingresos: totalIngresos,
      total_egresos:  totalEgresos,
      saldo:          totalIngresos - totalEgresos,
      cerrado_por:    claims.sub,
      observaciones:  parsed.data.observaciones ?? null,
    })
    .select("id")
    .single();

  if (errCierre) {
    if (errCierre.code === "23505") {
      return { ok: false, error: "La caja de este día ya fue cerrada" };
    }
    return { ok: false, error: errCierre.message };
  }

  // Vincular movimientos abiertos del día al cierre
  const { desde, hasta } = buildRango(parsed.data.fecha);
  await supabase
    .from("movimientos_caja")
    .update({ cierre_id: cierre.id })
    .eq("sucursal_id", parsed.data.sucursal_id)
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("cierre_id", null)
    .is("deleted_at", null);

  revalidatePath("/caja");
  return { ok: true, data: { id: cierre.id } };
}

function buildRango(fechaArt: string) {
  return {
    desde: new Date(`${fechaArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${fechaArt}T23:59:59.999-03:00`).toISOString(),
  };
}
