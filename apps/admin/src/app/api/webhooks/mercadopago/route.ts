import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyMpSignature,
  getMpClient,
  parseExternalReference,
  type WebhookEvent,
} from "@repo/integrations/mercadopago";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVEEDOR = "mercadopago";

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const dataId = event.data?.id;
  if (!dataId) {
    return NextResponse.json({ error: "missing_data_id" }, { status: 400 });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";

  if (secret) {
    const ok = verifyMpSignature(String(dataId), requestId, signature, secret);
    if (!ok) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "MP_WEBHOOK_SECRET_not_configured" },
      { status: 500 },
    );
  }

  const externalId = `${event.type ?? "unknown"}:${dataId}`;
  const service = createServiceClient();

  const { data: created, error: insertErr } = await service
    .from("webhook_eventos")
    .insert({
      proveedor: PROVEEDOR,
      external_id: externalId,
      payload: event,
      procesado: false,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, deduplicated: true });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const webhookId = created.id;

  try {
    if (event.type === "payment") {
      await processPaymentNotification(service, String(dataId));
    }

    await service
      .from("webhook_eventos")
      .update({
        procesado: true,
        procesado_at: new Date().toISOString(),
        intentos: 1,
      })
      .eq("id", webhookId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown_error";
    await service
      .from("webhook_eventos")
      .update({ error: errMsg, intentos: 1 })
      .eq("id", webhookId);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

async function processPaymentNotification(
  service: ServiceClient,
  paymentId: string,
): Promise<void> {
  const { payment } = getMpClient();
  const data = await payment.get({ id: paymentId });

  const externalRef = data.external_reference;
  if (!externalRef) return;

  const parsed = parseExternalReference(externalRef);
  if (!parsed) return;
  if (parsed.tipo !== "venta_seña" && parsed.tipo !== "venta_saldo") return;

  const { error } = await service
    .from("ventas")
    .update({
      mp_payment_id: String(paymentId),
      mp_status: data.status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.referencia_id);

  if (error) throw new Error(`update_ventas: ${error.message}`);
}

export function GET() {
  return NextResponse.json({ ok: true, service: "mercadopago_webhook" });
}
