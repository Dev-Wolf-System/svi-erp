import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadoLiquidacion, LiquidacionFilters } from "./schemas";

const LIST_COLUMNS = `
  id, periodo, estado,
  capital_base, tasa_aplicada, monto_interes, moneda,
  fecha_pago, metodo_pago, modo_pago_inversor, comprobante_url, external_ref,
  recibo_url,
  created_at,
  inversion:inversiones!liquidaciones_inversion_inversion_id_fkey!inner (
    id, numero_contrato,
    inversor:inversores!inversiones_inversor_id_fkey!inner ( id, nombre )
  )
`;

export interface LiquidacionListRow {
  id: string;
  periodo: string;
  estado: EstadoLiquidacion;
  capital_base: string;
  tasa_aplicada: string;
  monto_interes: string;
  moneda: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  modo_pago_inversor: "retirar" | "reinvertir";
  comprobante_url: string | null;
  external_ref: string | null;
  recibo_url: string | null;
  created_at: string;
  inversion: {
    id: string;
    numero_contrato: string;
    inversor: { id: string; nombre: string };
  };
}

export async function getLiquidaciones(
  filters: LiquidacionFilters,
): Promise<LiquidacionListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("liquidaciones_inversion")
    .select(LIST_COLUMNS)
    .order("periodo", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.inversion_id) query = query.eq("inversion_id", filters.inversion_id);
  if (filters.periodo_desde) query = query.gte("periodo", filters.periodo_desde);
  if (filters.periodo_hasta) query = query.lte("periodo", filters.periodo_hasta);

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getLiquidaciones: ${error.message}`);

  let rows = (data ?? []) as unknown as LiquidacionListRow[];

  // Filtro por inversor — Postgrest no soporta filtros sobre relaciones
  // anidadas en el mismo SELECT. Lo aplicamos en JS sobre la página.
  if (filters.inversor_id) {
    rows = rows.filter((r) => r.inversion.inversor.id === filters.inversor_id);
  }
  return rows;
}

export interface LiquidacionesStats {
  total: number;
  pendientes: number;
  pagadas: number;
  anuladas: number;
  /** Suma total de monto_interes en estado pagada (todas las monedas mezcladas — usar agrupado por moneda en UI). */
  total_pagado_ars: number;
  total_pagado_usd: number;
  total_pendiente_ars: number;
  total_pendiente_usd: number;
}

export async function getLiquidacionesStats(): Promise<LiquidacionesStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("liquidaciones_inversion")
    .select("estado, monto_interes, moneda");
  if (error) throw new Error(`getLiquidacionesStats: ${error.message}`);

  const stats: LiquidacionesStats = {
    total: 0,
    pendientes: 0,
    pagadas: 0,
    anuladas: 0,
    total_pagado_ars: 0,
    total_pagado_usd: 0,
    total_pendiente_ars: 0,
    total_pendiente_usd: 0,
  };
  for (const row of data ?? []) {
    stats.total += 1;
    const monto = Number(row.monto_interes);
    const moneda = (row.moneda as string)?.trim();
    if (row.estado === "pendiente") {
      stats.pendientes += 1;
      if (moneda === "ARS") stats.total_pendiente_ars += monto;
      if (moneda === "USD") stats.total_pendiente_usd += monto;
    } else if (row.estado === "pagada") {
      stats.pagadas += 1;
      if (moneda === "ARS") stats.total_pagado_ars += monto;
      if (moneda === "USD") stats.total_pagado_usd += monto;
    } else if (row.estado === "anulada") {
      stats.anuladas += 1;
    }
  }
  return stats;
}

export async function getLiquidacionesPorInversion(
  inversionId: string,
): Promise<LiquidacionListRow[]> {
  return getLiquidaciones({
    inversion_id: inversionId,
    limit: 200,
  });
}

export async function getLiquidacionById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("liquidaciones_inversion")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getLiquidacionById: ${error.message}`);
  }
  return data as unknown as LiquidacionListRow;
}

/** Inversiones activas — para el lote "generar mes actual" */
export async function getInversionesActivasParaLiquidar(): Promise<
  Array<{
    id: string;
    numero_contrato: string;
    capital_actual: string;
    tasa_mensual: string;
    moneda: string;
    inversor_nombre: string;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversiones")
    .select(
      `
      id, numero_contrato, capital_actual, tasa_mensual, moneda,
      inversor:inversores!inversiones_inversor_id_fkey!inner ( nombre )
      `,
    )
    .eq("estado", "activa")
    .is("deleted_at", null);
  if (error) throw new Error(`getInversionesActivasParaLiquidar: ${error.message}`);
  return (data ?? []).map(
    (row: {
      id: string;
      numero_contrato: string;
      capital_actual: string;
      tasa_mensual: string;
      moneda: string;
      inversor: { nombre: string } | { nombre: string }[];
    }) => ({
      id: row.id,
      numero_contrato: row.numero_contrato,
      capital_actual: row.capital_actual,
      tasa_mensual: row.tasa_mensual,
      moneda: row.moneda,
      inversor_nombre: Array.isArray(row.inversor)
        ? row.inversor[0]?.nombre ?? "—"
        : row.inversor.nombre,
    }),
  );
}
