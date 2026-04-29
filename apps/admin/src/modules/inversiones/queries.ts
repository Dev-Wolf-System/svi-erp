import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  EstadoInversion,
  EstadoRegulatorio,
  InversionFilters,
  TipoInstrumento,
} from "./schemas";

const LIST_COLUMNS = `
  id, numero_contrato, estado, tipo_instrumento, estado_regulatorio,
  capital_inicial, capital_actual, moneda, tasa_mensual,
  fecha_inicio, fecha_vencimiento,
  contrato_url, firma_metodo,
  created_at,
  inversor:inversores!inversiones_inversor_id_fkey!inner ( id, nombre, dni, cuit ),
  sucursal:sucursales!inversiones_sucursal_id_fkey ( id, nombre, codigo )
`;

export interface InversionListRow {
  id: string;
  numero_contrato: string;
  estado: EstadoInversion;
  tipo_instrumento: TipoInstrumento;
  estado_regulatorio: EstadoRegulatorio;
  capital_inicial: string;
  capital_actual: string;
  moneda: string;
  tasa_mensual: string;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  contrato_url: string | null;
  firma_metodo: string;
  created_at: string;
  inversor: { id: string; nombre: string; dni: string | null; cuit: string | null };
  sucursal: { id: string; nombre: string; codigo: string } | null;
}

export async function getInversiones(filters: InversionFilters): Promise<InversionListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("inversiones")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.tipo_instrumento) query = query.eq("tipo_instrumento", filters.tipo_instrumento);
  if (filters.estado_regulatorio)
    query = query.eq("estado_regulatorio", filters.estado_regulatorio);
  if (filters.inversor_id) query = query.eq("inversor_id", filters.inversor_id);

  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.ilike("numero_contrato", `%${s}%`);
  }

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getInversiones: ${error.message}`);
  return (data ?? []) as unknown as InversionListRow[];
}

export async function getInversionesCount(): Promise<{
  total: number;
  activa: number;
  suspendida: number;
  finalizada: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversiones")
    .select("estado")
    .is("deleted_at", null);
  if (error) throw new Error(`getInversionesCount: ${error.message}`);
  const counts = { total: 0, activa: 0, suspendida: 0, finalizada: 0 };
  for (const row of data ?? []) {
    counts.total += 1;
    counts[row.estado as EstadoInversion] += 1;
  }
  return counts;
}

const DETAIL_COLUMNS = `
  *,
  inversor:inversores!inversiones_inversor_id_fkey!inner (
    id, nombre, dni, cuit, email, telefono, banco_nombre
  ),
  sucursal:sucursales!inversiones_sucursal_id_fkey ( id, nombre, codigo, direccion )
`;

export async function getInversionById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversiones")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getInversionById: ${error.message}`);
  }
  return data;
}

export interface TasaHistorialRow {
  id: string;
  tasa_anterior: string | null;
  tasa_nueva: string;
  vigente_desde: string;
  motivo: string | null;
  created_at: string;
}

export async function getTasaHistorial(inversionId: string): Promise<TasaHistorialRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversion_tasa_historial")
    .select("id, tasa_anterior, tasa_nueva, vigente_desde, motivo, created_at")
    .eq("inversion_id", inversionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getTasaHistorial: ${error.message}`);
  return (data ?? []) as TasaHistorialRow[];
}

export interface AporteRow {
  id: string;
  monto: string;
  moneda: string;
  fecha_aporte: string;
  motivo: string | null;
  comprobante_url: string | null;
  created_at: string;
}

export async function getAportesPorInversion(
  inversionId: string,
): Promise<AporteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversion_aportes")
    .select("id, monto, moneda, fecha_aporte, motivo, comprobante_url, created_at")
    .eq("inversion_id", inversionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getAportesPorInversion: ${error.message}`);
  return (data ?? []) as AporteRow[];
}

/**
 * Lista inversores activos para el select del form de alta.
 * Trae solo (id, nombre) — los datos sensibles se piden en el detalle.
 */
export async function getInversoresParaSelect(): Promise<
  { id: string; nombre: string; cuit: string | null; dni: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversores")
    .select("id, nombre, cuit, dni")
    .is("deleted_at", null)
    .order("nombre");
  if (error) throw new Error(`getInversoresParaSelect: ${error.message}`);
  return (data ?? []) as Array<{
    id: string;
    nombre: string;
    cuit: string | null;
    dni: string | null;
  }>;
}
