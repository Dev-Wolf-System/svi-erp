"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInversorSession } from "@/lib/auth/inversor";
import { createServiceClient } from "@/lib/supabase/service";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const solicitarAporteSchema = z.object({
  inversion_id: z.string().uuid(),
  monto_estimado: z.coerce.number().positive("Monto inválido"),
  fecha_estimada: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha YYYY-MM-DD requerida"),
  motivo: z.string().max(500).optional().nullable(),
});

/**
 * El inversor solicita un aporte adicional. Queda pendiente hasta que el
 * operador confirme la transferencia recibida (genera el aporte real).
 *
 * Verificamos doblemente que la inversión sea del inversor logueado para
 * evitar bypass del param.
 */
export async function solicitarAporte(
  input: z.infer<typeof solicitarAporteSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = solicitarAporteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const session = await requireInversorSession();
  const service = createServiceClient();

  const { data: inv, error: invErr } = await service
    .from("inversiones")
    .select("id, inversor_id, empresa_id, estado, moneda")
    .eq("id", parsed.data.inversion_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (invErr || !inv || inv.inversor_id !== session.inversor_id) {
    return { ok: false, error: "Inversión no encontrada" };
  }
  if (inv.estado !== "activa") {
    return {
      ok: false,
      error: `No se pueden solicitar aportes en una inversión ${inv.estado}`,
    };
  }

  const { data, error } = await service
    .from("solicitudes_aporte")
    .insert({
      empresa_id: inv.empresa_id,
      inversion_id: inv.id,
      inversor_id: session.inversor_id,
      monto_estimado: parsed.data.monto_estimado,
      moneda: inv.moneda,
      fecha_estimada: parsed.data.fecha_estimada,
      motivo: parsed.data.motivo ?? null,
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/inversor");
  revalidatePath(`/portal/inversor/inversiones/${inv.id}`);
  return { ok: true, data: { id: data.id } };
}

const decidirModoSchema = z.object({
  liquidacion_id: z.string().uuid(),
  modo: z.enum(["retirar", "reinvertir"]),
});

/**
 * El inversor indica preferencia de retirar o reinvertir para una liquidación
 * pendiente. El operador puede honrarla o decidir distinto al pagar.
 */
export async function decidirModoLiquidacion(
  input: z.infer<typeof decidirModoSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = decidirModoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const session = await requireInversorSession();
  const service = createServiceClient();

  // Verificar que la liquidación es de una inversión del inversor.
  const { data: liq, error: fetchErr } = await service
    .from("liquidaciones_inversion")
    .select(
      `
      id, estado, inversion_id,
      inversion:inversiones!liquidaciones_inversion_inversion_id_fkey!inner ( inversor_id )
      `,
    )
    .eq("id", parsed.data.liquidacion_id)
    .maybeSingle();

  if (fetchErr || !liq) return { ok: false, error: "Liquidación no encontrada" };

  const inv = Array.isArray(liq.inversion) ? liq.inversion[0] : liq.inversion;
  if (!inv || inv.inversor_id !== session.inversor_id) {
    return { ok: false, error: "Liquidación no encontrada" };
  }
  if (liq.estado !== "pendiente") {
    return {
      ok: false,
      error: "Solo podés decidir el modo de liquidaciones pendientes.",
    };
  }

  const { error } = await service
    .from("liquidaciones_inversion")
    .update({
      modo_solicitado_inversor: parsed.data.modo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.liquidacion_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/inversor");
  revalidatePath(`/portal/inversor/inversiones/${liq.inversion_id}`);
  return { ok: true, data: { id: parsed.data.liquidacion_id } };
}

