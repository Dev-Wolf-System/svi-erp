import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VehiculoFilters } from "./schemas";

/** Columnas seleccionadas para el listado (no traer fotos[] completo) */
const LIST_COLUMNS = `
  id, marca, modelo, version, anio, patente, tipo, condicion, estado,
  kilometraje, combustible, color,
  precio_venta, moneda,
  foto_principal_url,
  reservado_hasta,
  sucursal_id,
  created_at,
  sucursal:sucursales!inner ( id, nombre, codigo )
`;

const DETAIL_COLUMNS = `
  *,
  sucursal:sucursales!inner ( id, nombre, codigo ),
  precio_historial:vehiculo_precio_historial ( id, precio_anterior, precio_nuevo, moneda, motivo, created_at )
`;

export interface VehiculoRow {
  id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  patente: string | null;
  tipo: string;
  condicion: string;
  estado: string;
  kilometraje: number | null;
  combustible: string | null;
  color: string | null;
  precio_venta: string;
  moneda: string;
  foto_principal_url: string | null;
  reservado_hasta: string | null;
  sucursal_id: string;
  created_at: string;
  sucursal: { id: string; nombre: string; codigo: string };
}

/** Listado con filtros + cursor pagination */
export async function getVehiculos(filters: VehiculoFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("vehiculos")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.condicion) query = query.eq("condicion", filters.condicion);
  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.sucursal_id) query = query.eq("sucursal_id", filters.sucursal_id);
  if (filters.marca) query = query.ilike("marca", `%${filters.marca}%`);
  if (filters.precio_min !== undefined)
    query = query.gte("precio_venta", filters.precio_min);
  if (filters.precio_max !== undefined)
    query = query.lte("precio_venta", filters.precio_max);

  // Búsqueda — usa LIKE en marca/modelo/patente. La búsqueda full-text con tsvector
  // se implementa más adelante con un RPC dedicado.
  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.or(
      `marca.ilike.%${s}%,modelo.ilike.%${s}%,patente.ilike.%${s}%,version.ilike.%${s}%`,
    );
  }

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getVehiculos: ${error.message}`);

  return (data ?? []) as unknown as VehiculoRow[];
}

/** Conteo total de stock (para badge en header) — barato porque count="exact" usa el índice */
export async function getStockCount(empresaId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("vehiculos")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (empresaId) query = query.eq("empresa_id", empresaId);
  const { count, error } = await query;
  if (error) throw new Error(`getStockCount: ${error.message}`);
  return count ?? 0;
}

export async function getVehiculoById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getVehiculoById: ${error.message}`);
  }
  return data;
}

export async function getSucursales() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sucursales")
    .select("id, nombre, codigo")
    .is("deleted_at", null)
    .eq("activa", true)
    .order("nombre");
  if (error) throw new Error(`getSucursales: ${error.message}`);
  return data ?? [];
}
