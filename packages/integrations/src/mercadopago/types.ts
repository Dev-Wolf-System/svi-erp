/**
 * Tipos para integración con Mercado Pago Argentina (Checkout Pro).
 * SVI usa MP **solo para señas online** — el pago grueso va por transferencia.
 */

export interface ItemPreference {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id?: "ARS";
}

export interface PayerInfo {
  name?: string;
  surname?: string;
  email?: string;
  identification?: { type: "DNI" | "CUIT"; number: string };
}

export interface CreatePreferenceInput {
  /** Tipo de operación — entra en external_reference para routing del webhook */
  tipo: "venta_seña" | "venta_saldo" | "otro";
  /** ID en nuestra DB (venta.id, etc.) */
  referencia_id: string;
  /** ID de sucursal — para routing en webhook */
  sucursal_id: string;
  items: ItemPreference[];
  payer?: PayerInfo;
  /**
   * Idempotency key estable por operación.
   * MP la usa para detectar reintentos del cliente y NO crear preferences duplicadas.
   * Formato sugerido: `${tipo}-${referencia_id}-${intento}`.
   */
  idempotency_key: string;
  /** URLs de retorno tras pago — se calculan a partir de NEXT_PUBLIC_APP_URL si se omite */
  back_urls?: { success: string; failure: string; pending: string };
  /** Expiración en horas (default 24h) */
  expira_horas?: number;
}

export interface PreferenceCreated {
  id: string;
  init_point: string;       // URL de checkout productivo
  sandbox_init_point: string;
  external_reference: string;
}

/**
 * Estados normalizados de un pago MP.
 * Lista oficial: https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post
 */
export type MpPaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export interface WebhookEvent {
  type: string;
  action?: string;
  data: { id: string };
  date_created: string;
  user_id?: number;
  api_version?: string;
  live_mode?: boolean;
}
