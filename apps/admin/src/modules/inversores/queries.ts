import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InversorFilters } from "./schemas";

const LIST_COLUMNS = `
  id, nombre, cliente_id,
  dni, cuit, email, telefono,
  banco_nombre,
  portal_activo,
  created_at
`;

export interface InversorRow {
  id: string;
  nombre: string;
  cliente_id: string | null;
  dni: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  banco_nombre: string | null;
  portal_activo: boolean;
  created_at: string;
}

export async function getInversores(filters: InversorFilters): Promise<InversorRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("inversores")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.portal_activo !== undefined)
    query = query.eq("portal_activo", filters.portal_activo);

  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.or(
      `nombre.ilike.%${s}%,email.ilike.%${s}%,dni.ilike.%${s}%,cuit.ilike.%${s}%,banco_nombre.ilike.%${s}%`,
    );
  }

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getInversores: ${error.message}`);
  return (data ?? []) as unknown as InversorRow[];
}

export async function getInversoresCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("inversores")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (error) throw new Error(`getInversoresCount: ${error.message}`);
  return count ?? 0;
}

/**
 * Devuelve el detalle completo del inversor incluyendo CBU y alias.
 * RECORDATORIO: cuando se active pgsodium, la query debe pasar por una
 * VIEW descifradora con permisos limitados — ver PRODUCTION_HARDENING §13.
 */
export async function getInversorById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversores")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getInversorById: ${error.message}`);
  }
  return data;
}
