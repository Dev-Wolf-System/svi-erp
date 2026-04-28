import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadoVenta, VentaFilters } from "./schemas";

const LIST_COLUMNS = `
  id, numero_operacion, estado, tipo_pago,
  precio_venta, descuento, precio_final, moneda,
  comision_pct, comision_monto,
  cae, mp_payment_id, contrato_url,
  vendedor_id, sucursal_id,
  created_at, updated_at,
  vehiculo:vehiculos!inner ( id, marca, modelo, anio, patente, foto_principal_url ),
  cliente:clientes!inner ( id, tipo, nombre, apellido, razon_social, dni, cuit ),
  sucursal:sucursales!inner ( id, nombre, codigo )
`;

const DETAIL_COLUMNS = `
  *,
  vehiculo:vehiculos!inner ( id, marca, modelo, version, anio, patente, color, kilometraje, foto_principal_url ),
  cliente:clientes!inner ( id, tipo, nombre, apellido, razon_social, dni, cuit, email, telefono, celular, direccion, localidad, provincia ),
  sucursal:sucursales!inner ( id, nombre, codigo, direccion ),
  vehiculo_parte:vehiculos!ventas_vehiculo_parte_id_fkey ( id, marca, modelo, anio, patente ),
  banco:bancos ( id, nombre, contacto, condiciones )
`;

export interface VentaListRow {
  id: string;
  numero_operacion: string;
  estado: EstadoVenta;
  tipo_pago: "contado" | "financiado" | "parte_pago";
  precio_venta: string;
  descuento: string;
  precio_final: string;
  moneda: string;
  comision_pct: string | null;
  comision_monto: string | null;
  cae: string | null;
  mp_payment_id: string | null;
  contrato_url: string | null;
  vendedor_id: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  vehiculo: {
    id: string;
    marca: string;
    modelo: string;
    anio: number;
    patente: string | null;
    foto_principal_url: string | null;
  };
  cliente: {
    id: string;
    tipo: "persona" | "empresa";
    nombre: string;
    apellido: string | null;
    razon_social: string | null;
    dni: string | null;
    cuit: string | null;
  };
  sucursal: { id: string; nombre: string; codigo: string };
}

export async function getVentas(filters: VentaFilters): Promise<VentaListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("ventas")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.sucursal_id) query = query.eq("sucursal_id", filters.sucursal_id);

  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.ilike("numero_operacion", `%${s}%`);
  }

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getVentas: ${error.message}`);
  return (data ?? []) as unknown as VentaListRow[];
}

export async function getVentasCount(): Promise<{
  total: number;
  porEstado: Record<EstadoVenta, number>;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("estado")
    .is("deleted_at", null);

  if (error) throw new Error(`getVentasCount: ${error.message}`);

  const porEstado: Record<EstadoVenta, number> = {
    reserva: 0,
    documentacion: 0,
    aprobado: 0,
    entregado: 0,
    finalizado: 0,
    anulado: 0,
  };
  for (const row of data ?? []) {
    const e = row.estado as EstadoVenta;
    if (e in porEstado) porEstado[e]++;
  }
  return { total: data?.length ?? 0, porEstado };
}

export async function getVentasGroupedByEstado(): Promise<Record<EstadoVenta, VentaListRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getVentasGroupedByEstado: ${error.message}`);

  const groups: Record<EstadoVenta, VentaListRow[]> = {
    reserva: [],
    documentacion: [],
    aprobado: [],
    entregado: [],
    finalizado: [],
    anulado: [],
  };
  for (const v of (data ?? []) as unknown as VentaListRow[]) {
    if (v.estado in groups) groups[v.estado].push(v);
  }
  return groups;
}

export async function getVentaById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getVentaById: ${error.message}`);
  }
  return data;
}
