import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import { LEAD_ESTADOS, type LeadEstado } from "./schemas";

const LIST_COLUMNS = `
  id, nombre, email, telefono, mensaje, estado,
  vehiculo_interes, vendedor_id, sucursal_id, origen,
  created_at, updated_at
`;

export interface LeadRow {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  mensaje: string | null;
  estado: LeadEstado;
  vehiculo_interes: string | null;
  vendedor_id: string | null;
  sucursal_id: string | null;
  origen: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadsByEstado = Record<LeadEstado, LeadRow[]>;

export async function getLeads(): Promise<LeadsByEstado> {
  const [claims, supabase] = await Promise.all([getSviClaims(), createClient()]);
  let q = supabase.from("leads").select(LIST_COLUMNS).order("updated_at", { ascending: false });

  if (claims?.rol === "vendedor") {
    q = q.eq("vendedor_id", claims.sub);
  }

  const { data, error } = await q;

  if (error) throw new Error(`getLeads: ${error.message}`);

  const grouped: LeadsByEstado = {
    nuevo: [],
    contactado: [],
    calificado: [],
    oportunidad: [],
    ganado: [],
    perdido: [],
  };
  for (const row of (data ?? []) as unknown as LeadRow[]) {
    const bucket: LeadEstado = LEAD_ESTADOS.includes(row.estado) ? row.estado : "nuevo";
    grouped[bucket].push(row);
  }
  return grouped;
}

export async function getLeadsCount(): Promise<number> {
  const [claims, supabase] = await Promise.all([getSviClaims(), createClient()]);
  let q = supabase.from("leads").select("id", { count: "exact", head: true });

  if (claims?.rol === "vendedor") {
    q = q.eq("vendedor_id", claims.sub);
  }

  const { count, error } = await q;
  if (error) throw new Error(`getLeadsCount: ${error.message}`);
  return count ?? 0;
}
