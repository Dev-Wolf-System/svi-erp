import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { InversorSession } from "@/lib/auth/inversor";

/**
 * Queries del portal del inversor.
 *
 * IMPORTANTE: usan service_role para evitar dependencia con RLS — el
 * aislamiento se garantiza con el filtro explícito por inversor_id de la
 * sesión validada en `getInversorSession`.
 */

export interface InversionPortalRow {
  id: string;
  numero_contrato: string;
  estado: "activa" | "suspendida" | "finalizada";
  capital_inicial: string;
  capital_actual: string;
  moneda: string;
  tasa_mensual: string;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  contrato_url: string | null;
}

export async function getInversionesDelInversor(
  s: InversorSession,
): Promise<InversionPortalRow[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("inversiones")
    .select(
      "id, numero_contrato, estado, capital_inicial, capital_actual, moneda, tasa_mensual, fecha_inicio, fecha_vencimiento, contrato_url",
    )
    .eq("inversor_id", s.inversor_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getInversionesDelInversor: ${error.message}`);
  return (data ?? []) as InversionPortalRow[];
}

export interface LiquidacionPortalRow {
  id: string;
  inversion_id: string;
  periodo: string;
  estado: "pendiente" | "pagada" | "anulada";
  capital_base: string;
  tasa_aplicada: string;
  monto_interes: string;
  moneda: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  modo_pago_inversor: "retirar" | "reinvertir";
  modo_solicitado_inversor: "retirar" | "reinvertir" | null;
  recibo_url: string | null;
  numero_contrato: string;
}

export async function getLiquidacionesDelInversor(
  s: InversorSession,
  options: { inversion_id?: string; limit?: number } = {},
): Promise<LiquidacionPortalRow[]> {
  const service = createServiceClient();
  let query = service
    .from("liquidaciones_inversion")
    .select(
      `
      id, inversion_id, periodo, estado,
      capital_base, tasa_aplicada, monto_interes, moneda,
      fecha_pago, metodo_pago, modo_pago_inversor, modo_solicitado_inversor,
      recibo_url,
      inversion:inversiones!liquidaciones_inversion_inversion_id_fkey!inner ( numero_contrato, inversor_id )
      `,
    )
    .order("periodo", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.inversion_id) query = query.eq("inversion_id", options.inversion_id);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getLiquidacionesDelInversor: ${error.message}`);

  type Row = {
    id: string;
    inversion_id: string;
    periodo: string;
    estado: LiquidacionPortalRow["estado"];
    capital_base: string;
    tasa_aplicada: string;
    monto_interes: string;
    moneda: string;
    fecha_pago: string | null;
    metodo_pago: string | null;
    modo_pago_inversor: "retirar" | "reinvertir";
    modo_solicitado_inversor: "retirar" | "reinvertir" | null;
    recibo_url: string | null;
    inversion:
      | { numero_contrato: string; inversor_id: string }
      | { numero_contrato: string; inversor_id: string }[];
  };

  const rows = ((data ?? []) as Row[]).filter((r) => {
    const inv = Array.isArray(r.inversion) ? r.inversion[0] : r.inversion;
    return inv?.inversor_id === s.inversor_id;
  });

  return rows.map((r): LiquidacionPortalRow => {
    const inv = Array.isArray(r.inversion) ? r.inversion[0]! : r.inversion;
    return {
      id: r.id,
      inversion_id: r.inversion_id,
      periodo: r.periodo,
      estado: r.estado,
      capital_base: r.capital_base,
      tasa_aplicada: r.tasa_aplicada,
      monto_interes: r.monto_interes,
      moneda: r.moneda,
      fecha_pago: r.fecha_pago,
      metodo_pago: r.metodo_pago,
      modo_pago_inversor: r.modo_pago_inversor,
      modo_solicitado_inversor: r.modo_solicitado_inversor,
      recibo_url: r.recibo_url,
      numero_contrato: inv.numero_contrato,
    };
  });
}

export interface SolicitudAportePortalRow {
  id: string;
  inversion_id: string;
  monto_estimado: string;
  moneda: string;
  fecha_estimada: string;
  motivo: string | null;
  estado: "pendiente" | "confirmada" | "rechazada" | "expirada";
  motivo_rechazo: string | null;
  resuelto_at: string | null;
  created_at: string;
  numero_contrato: string;
}

export async function getSolicitudesDelInversor(
  s: InversorSession,
): Promise<SolicitudAportePortalRow[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("solicitudes_aporte")
    .select(
      `
      id, inversion_id, monto_estimado, moneda, fecha_estimada, motivo,
      estado, motivo_rechazo, resuelto_at, created_at,
      inversion:inversiones!solicitudes_aporte_inversion_id_fkey!inner ( numero_contrato )
      `,
    )
    .eq("inversor_id", s.inversor_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getSolicitudesDelInversor: ${error.message}`);

  type Row = {
    id: string;
    inversion_id: string;
    monto_estimado: string;
    moneda: string;
    fecha_estimada: string;
    motivo: string | null;
    estado: SolicitudAportePortalRow["estado"];
    motivo_rechazo: string | null;
    resuelto_at: string | null;
    created_at: string;
    inversion: { numero_contrato: string } | { numero_contrato: string }[];
  };

  return ((data ?? []) as Row[]).map(
    (r): SolicitudAportePortalRow => ({
      id: r.id,
      inversion_id: r.inversion_id,
      monto_estimado: r.monto_estimado,
      moneda: r.moneda,
      fecha_estimada: r.fecha_estimada,
      motivo: r.motivo,
      estado: r.estado,
      motivo_rechazo: r.motivo_rechazo,
      resuelto_at: r.resuelto_at,
      created_at: r.created_at,
      numero_contrato: Array.isArray(r.inversion)
        ? r.inversion[0]?.numero_contrato ?? "—"
        : r.inversion.numero_contrato,
    }),
  );
}
