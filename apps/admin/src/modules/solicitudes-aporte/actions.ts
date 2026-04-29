"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import { registrarAporte } from "@/modules/inversiones/actions";
import {
  solicitudConfirmarSchema,
  solicitudRechazarSchema,
  type SolicitudConfirmarInput,
  type SolicitudRechazarInput,
} from "./schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Confirma una solicitud de aporte: registra el aporte real (vía
 * registrarAporte del módulo inversiones) y marca la solicitud como
 * confirmada con link al aporte generado.
 *
 * Si el operador recibió un monto distinto al estimado, puede pasarlo
 * en `monto_real`; default = monto_estimado.
 */
export async function confirmarSolicitudAporte(
  input: SolicitudConfirmarInput,
): Promise<ActionResult<{ aporte_id: string }>> {
  const parsed = solicitudConfirmarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();
  const { data: solic, error: fetchErr } = await supabase
    .from("solicitudes_aporte")
    .select("id, inversion_id, monto_estimado, fecha_estimada, motivo, estado")
    .eq("id", parsed.data.id)
    .single();

  if (fetchErr || !solic) {
    return { ok: false, error: "Solicitud no encontrada" };
  }
  if (solic.estado !== "pendiente") {
    return { ok: false, error: `La solicitud ya fue ${solic.estado}` };
  }

  const monto = parsed.data.monto_real ?? Number(solic.monto_estimado);
  const fecha = parsed.data.fecha_real ?? solic.fecha_estimada;

  // Delegar al action del módulo inversiones — reutiliza la validación
  // de moneda, redondeo y trazabilidad.
  const aporteRes = await registrarAporte({
    inversion_id: solic.inversion_id,
    monto,
    fecha_aporte: fecha,
    motivo: solic.motivo
      ? `Aporte por solicitud del inversor: ${solic.motivo}`
      : "Aporte solicitado por el inversor",
    comprobante_url:
      parsed.data.comprobante_url && parsed.data.comprobante_url !== ""
        ? parsed.data.comprobante_url
        : null,
  });

  if (!aporteRes.ok) {
    return { ok: false, error: `No se pudo registrar el aporte: ${aporteRes.error}` };
  }

  const ahora = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("solicitudes_aporte")
    .update({
      estado: "confirmada",
      aporte_id: aporteRes.data.id,
      resuelto_por: claims.sub,
      resuelto_at: ahora,
      updated_at: ahora,
    })
    .eq("id", parsed.data.id);

  if (updErr) {
    return {
      ok: false,
      error: `Aporte registrado pero no se actualizó la solicitud: ${updErr.message}`,
    };
  }

  revalidatePath("/solicitudes-aporte");
  revalidatePath(`/inversiones/${solic.inversion_id}`);
  revalidatePath("/inversiones");
  return { ok: true, data: { aporte_id: aporteRes.data.id } };
}

export async function rechazarSolicitudAporte(
  input: SolicitudRechazarInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = solicitudRechazarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Motivo requerido (mín 3)" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("solicitudes_aporte")
    .update({
      estado: "rechazada",
      motivo_rechazo: parsed.data.motivo_rechazo,
      resuelto_por: claims.sub,
      resuelto_at: ahora,
      updated_at: ahora,
    })
    .eq("id", parsed.data.id)
    .eq("estado", "pendiente");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/solicitudes-aporte");
  return { ok: true, data: { id: parsed.data.id } };
}
