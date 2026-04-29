import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadoSolicitud } from "./schemas";

export interface SolicitudAporteRow {
  id: string;
  monto_estimado: string;
  moneda: string;
  fecha_estimada: string;
  motivo: string | null;
  estado: EstadoSolicitud;
  motivo_rechazo: string | null;
  resuelto_at: string | null;
  aporte_id: string | null;
  created_at: string;
  inversion: { id: string; numero_contrato: string };
  inversor: { id: string; nombre: string };
}

const LIST_COLUMNS = `
  id, monto_estimado, moneda, fecha_estimada, motivo,
  estado, motivo_rechazo, resuelto_at, aporte_id, created_at,
  inversion:inversiones!solicitudes_aporte_inversion_id_fkey!inner ( id, numero_contrato ),
  inversor:inversores!solicitudes_aporte_inversor_id_fkey!inner ( id, nombre )
`;

export async function getSolicitudesPendientes(): Promise<SolicitudAporteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitudes_aporte")
    .select(LIST_COLUMNS)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getSolicitudesPendientes: ${error.message}`);
  return (data ?? []) as unknown as SolicitudAporteRow[];
}

export async function getSolicitudesAporte(): Promise<SolicitudAporteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitudes_aporte")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`getSolicitudesAporte: ${error.message}`);
  return (data ?? []) as unknown as SolicitudAporteRow[];
}

export async function getSolicitudesPendientesCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("solicitudes_aporte")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente");
  if (error) return 0;
  return count ?? 0;
}
