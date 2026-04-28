import { getMpClient, buildExternalReference } from "./client";
import type { CreatePreferenceInput, PreferenceCreated } from "./types";

/**
 * Crea una Preference de Checkout Pro.
 *
 * - `idempotency_key` evita duplicar la preference si el cliente reintenta.
 * - `external_reference` lleva tipo:sucursal:id para routing del webhook.
 * - `auto_return` solo activa con HTTPS (en dev local NO se setea, MP lo rechaza).
 */
export async function createPreference(
  input: CreatePreferenceInput,
): Promise<PreferenceCreated> {
  const { preference } = getMpClient();
  const externalReference = buildExternalReference(
    input.tipo,
    input.sucursal_id,
    input.referencia_id,
  );

  const expiraHoras = input.expira_horas ?? 24;
  const expiration_date_to = new Date(Date.now() + expiraHoras * 60 * 60 * 1000).toISOString();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const back_urls = input.back_urls ?? {
    success: `${baseUrl}/pago/exito`,
    failure: `${baseUrl}/pago/error`,
    pending: `${baseUrl}/pago/pendiente`,
  };

  const isHttps = baseUrl.startsWith("https://");

  const result = await preference.create({
    requestOptions: { idempotencyKey: input.idempotency_key },
    body: {
      items: input.items.map((it) => ({
        id: it.id,
        title: it.title,
        description: it.description ?? it.title,
        quantity: it.quantity,
        unit_price: it.unit_price,
        currency_id: it.currency_id ?? "ARS",
      })),
      payer: input.payer,
      back_urls,
      ...(isHttps ? { auto_return: "approved" as const } : {}),
      external_reference: externalReference,
      expiration_date_to,
      statement_descriptor: "SOLO VEHICULOS",
      payment_methods: { installments: 1 },
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error("MP no devolvió init_point — revisar credenciales");
  }

  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point ?? result.init_point,
    external_reference: externalReference,
  };
}
