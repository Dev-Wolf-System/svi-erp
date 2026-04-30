import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyN8nSecret } from "@/lib/webhooks/n8n-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { generarLiquidacionesMesActual } from "@/modules/liquidaciones-inversion/actions";
import {
  getAdminsNotificables,
  normalizarTelefonoWA,
} from "@/lib/notificaciones/destinatarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVEEDOR = "n8n";

/**
 * F5.7 — Webhook idempotente que dispara la generación de liquidaciones del
 * mes actual para todas las inversiones activas.
 *
 * Llamado por el workflow N8N `01-liquidacion-mensual` (carpeta /personal/SVI-ERP)
 * el día 1 de cada mes a las 07:30 ART.
 *
 * Body opcional:
 *   {
 *     periodo?: "YYYY-MM",       // default: mes actual
 *     empresa_ids?: string[],    // default: todas
 *   }
 *
 * Idempotencia:
 *   external_id = `liq-mensual:${empresa_id_csv|all}:${YYYYMM}`
 *   La unique constraint en webhook_eventos atrapa el reintento → 200 deduplicated.
 *
 * Auth:
 *   header `x-n8n-secret` (en producción obligatorio).
 */
export async function POST(req: NextRequest) {
  const authError = verifyN8nSecret(req);
  if (authError) return authError;

  let body: { periodo?: string; empresa_ids?: string[] } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const periodoYYYYMM =
    body.periodo?.replace("-", "") ??
    new Date().toISOString().slice(0, 7).replace("-", "");

  if (!/^\d{6}$/.test(periodoYYYYMM)) {
    return NextResponse.json(
      { error: "invalid_periodo", expected: "YYYY-MM" },
      { status: 400 },
    );
  }

  const empresaScope =
    body.empresa_ids && body.empresa_ids.length > 0
      ? [...body.empresa_ids].sort().join(",")
      : "all";
  const externalId = `liq-mensual:${empresaScope}:${periodoYYYYMM}`;

  const service = createServiceClient();

  const { data: created, error: insertErr } = await service
    .from("webhook_eventos")
    .insert({
      proveedor: PROVEEDOR,
      external_id: externalId,
      payload: { periodo: periodoYYYYMM, empresa_ids: body.empresa_ids ?? null },
      procesado: false,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { ok: true, deduplicated: true, external_id: externalId },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "webhook_log_failed", detail: insertErr.message },
      { status: 500 },
    );
  }

  try {
    const result = await generarLiquidacionesMesActual({
      mode: "system",
      empresaIds: body.empresa_ids,
    });

    if (!result.ok) {
      await service
        .from("webhook_eventos")
        .update({
          error: result.error,
          intentos: 1,
        })
        .eq("id", created.id);
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 },
      );
    }

    // Resolver destinatarios para que N8N los itere en la rama de notificación.
    // El owner / admin viene de Supabase (single source of truth) — si cambia,
    // el workflow no necesita rebuilds. requireWhatsapp=true descarta los que
    // no tengan telefono cargado.
    const admins = await getAdminsNotificables(body.empresa_ids ?? null, {
      requireWhatsapp: true,
    });

    const notificarA = admins
      .map((a) => ({
        nombre: a.nombre,
        telefono_wa: normalizarTelefonoWA(a.telefono),
        email: a.email,
      }))
      .filter((a) => a.telefono_wa !== null);

    await service
      .from("webhook_eventos")
      .update({
        procesado: true,
        procesado_at: new Date().toISOString(),
        payload: {
          periodo: periodoYYYYMM,
          empresa_ids: body.empresa_ids ?? null,
          resumen: result.data,
          destinatarios: notificarA.length,
        },
      })
      .eq("id", created.id);

    return NextResponse.json(
      {
        ok: true,
        deduplicated: false,
        periodo: periodoYYYYMM,
        ...result.data,
        notificar_a: notificarA,
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await service
      .from("webhook_eventos")
      .update({ error: msg, intentos: 1 })
      .eq("id", created.id);
    return NextResponse.json({ error: "exception", detail: msg }, { status: 500 });
  }
}
