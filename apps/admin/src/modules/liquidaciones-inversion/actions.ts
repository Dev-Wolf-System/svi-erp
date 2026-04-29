"use server";

import { revalidatePath } from "next/cache";
import {
  calcularLiquidacionPeriodo,
  primerDiaDelMes,
  type Moneda,
  type PeriodoYYYYMM,
} from "@repo/utils/calculos-fci";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  liquidacionGenerarSchema,
  liquidacionPagarSchema,
  liquidacionAnularSchema,
  type LiquidacionGenerarInput,
  type LiquidacionPagarInput,
  type LiquidacionAnularInput,
} from "./schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Genera (o devuelve la existente) la liquidación de un período para una
 * inversión. Idempotente vía external_ref UNIQUE.
 *
 * external_ref = `LIQ-<numero_contrato>-<YYYYMM>` — estable por mes.
 *
 * Reglas:
 *   - La inversión debe existir, estar activa y no borrada.
 *   - El período no puede ser anterior a fecha_inicio.
 *   - Si ya existe, devuelve la existente con flag {ya_existia: true}.
 */
export async function generarLiquidacion(
  input: LiquidacionGenerarInput,
): Promise<
  ActionResult<{ id: string; ya_existia: boolean; monto_interes: number }>
> {
  const parsed = liquidacionGenerarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: inv, error: invErr } = await supabase
    .from("inversiones")
    .select(
      "id, numero_contrato, estado, fecha_inicio, capital_actual, tasa_mensual, moneda",
    )
    .eq("id", parsed.data.inversion_id)
    .is("deleted_at", null)
    .single();
  if (invErr || !inv) return { ok: false, error: "Inversión no encontrada" };

  if (inv.estado !== "activa") {
    return {
      ok: false,
      error: `No se puede liquidar una inversión en estado ${inv.estado}`,
    };
  }

  const periodo: PeriodoYYYYMM = (parsed.data.periodo ??
    primerDiaDelMes(new Date().toISOString())) as PeriodoYYYYMM;

  if (periodo < primerDiaDelMes(inv.fecha_inicio)) {
    return {
      ok: false,
      error: "El período es anterior al inicio del contrato",
    };
  }

  const externalRef = `LIQ-${inv.numero_contrato}-${periodo.slice(0, 7).replace("-", "")}`;

  // Idempotencia: si ya existe, devolverla.
  const { data: existente } = await supabase
    .from("liquidaciones_inversion")
    .select("id, monto_interes")
    .eq("external_ref", externalRef)
    .maybeSingle();

  if (existente) {
    return {
      ok: true,
      data: {
        id: existente.id,
        ya_existia: true,
        monto_interes: Number(existente.monto_interes),
      },
    };
  }

  const liq = calcularLiquidacionPeriodo({
    periodo,
    capital_base: Number(inv.capital_actual),
    tasa_aplicada_pct: Number(inv.tasa_mensual),
    moneda: inv.moneda as Moneda,
  });

  const { data: created, error: insertErr } = await supabase
    .from("liquidaciones_inversion")
    .insert({
      empresa_id: claims.empresa_id,
      inversion_id: inv.id,
      periodo,
      capital_base: liq.capital_base,
      tasa_aplicada: liq.tasa_aplicada_pct,
      monto_interes: liq.monto_interes,
      moneda: liq.moneda,
      estado: "pendiente",
      external_ref: externalRef,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Si llegó la unique violation por carrera (otro request creó la fila
    // entre el SELECT y el INSERT), reintentamos lectura.
    if (insertErr.code === "23505") {
      const { data: again } = await supabase
        .from("liquidaciones_inversion")
        .select("id, monto_interes")
        .eq("external_ref", externalRef)
        .maybeSingle();
      if (again) {
        return {
          ok: true,
          data: {
            id: again.id,
            ya_existia: true,
            monto_interes: Number(again.monto_interes),
          },
        };
      }
    }
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${inv.id}`);
  return {
    ok: true,
    data: {
      id: created.id,
      ya_existia: false,
      monto_interes: liq.monto_interes,
    },
  };
}

/**
 * Genera liquidaciones del mes actual para TODAS las inversiones activas.
 * Idempotente — las que ya existen no se duplican.
 *
 * Devuelve un resumen con creadas/ya_existian/errores. El cron mensual
 * de pg_cron también termina llamando a esta misma lógica.
 */
export async function generarLiquidacionesMesActual(): Promise<
  ActionResult<{ creadas: number; ya_existian: number; errores: string[] }>
> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: invs, error } = await supabase
    .from("inversiones")
    .select("id, numero_contrato")
    .eq("estado", "activa")
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  let creadas = 0;
  let ya_existian = 0;
  const errores: string[] = [];

  for (const inv of invs ?? []) {
    const res = await generarLiquidacion({ inversion_id: inv.id });
    if (!res.ok) {
      errores.push(`${inv.numero_contrato}: ${res.error}`);
    } else if (res.data.ya_existia) {
      ya_existian += 1;
    } else {
      creadas += 1;
    }
  }

  revalidatePath("/liquidaciones");
  return { ok: true, data: { creadas, ya_existian, errores } };
}

export async function pagarLiquidacion(
  input: LiquidacionPagarInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = liquidacionPagarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();

  const { data: liq, error: fetchErr } = await supabase
    .from("liquidaciones_inversion")
    .select("estado, inversion_id")
    .eq("id", parsed.data.id)
    .single();
  if (fetchErr || !liq) return { ok: false, error: "Liquidación no encontrada" };

  if (liq.estado !== "pendiente") {
    return {
      ok: false,
      error: `Solo se pueden pagar liquidaciones pendientes (estado actual: ${liq.estado})`,
    };
  }

  const fecha = parsed.data.fecha_pago ?? new Date().toISOString();
  const comprobanteUrl =
    parsed.data.comprobante_url && parsed.data.comprobante_url !== ""
      ? parsed.data.comprobante_url
      : null;

  const { error } = await supabase
    .from("liquidaciones_inversion")
    .update({
      estado: "pagada",
      fecha_pago: fecha,
      metodo_pago: parsed.data.metodo_pago,
      comprobante_url: comprobanteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${liq.inversion_id}`);
  return { ok: true, data: { id: parsed.data.id } };
}

export async function anularLiquidacion(
  input: LiquidacionAnularInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = liquidacionAnularSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Motivo requerido (mínimo 3 caracteres)" };

  const supabase = await createClient();

  const { data: liq, error: fetchErr } = await supabase
    .from("liquidaciones_inversion")
    .select("estado, inversion_id, comprobante_url")
    .eq("id", parsed.data.id)
    .single();
  if (fetchErr || !liq) return { ok: false, error: "Liquidación no encontrada" };

  if (liq.estado === "pagada") {
    return {
      ok: false,
      error: "No se puede anular una liquidación pagada — generar reverso manual",
    };
  }
  if (liq.estado === "anulada") {
    return { ok: false, error: "Ya estaba anulada" };
  }

  // Guardamos el motivo en comprobante_url como fallback (no hay columna motivo).
  // El histórico de anulaciones queda en audit_log.
  const motivoSuffix = `\n[ANULADA] ${parsed.data.motivo}`;
  const { error } = await supabase
    .from("liquidaciones_inversion")
    .update({
      estado: "anulada",
      comprobante_url: (liq.comprobante_url ?? "") + motivoSuffix,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${liq.inversion_id}`);
  return { ok: true, data: { id: parsed.data.id } };
}
