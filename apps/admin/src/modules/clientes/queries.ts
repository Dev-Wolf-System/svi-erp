import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ClienteFilters } from "./schemas";

const LIST_COLUMNS = `
  id, tipo, nombre, apellido, razon_social,
  dni, cuit, email, telefono, celular,
  localidad, provincia,
  portal_activo, origen,
  created_at
`;

export interface ClienteRow {
  id: string;
  tipo: "persona" | "empresa";
  nombre: string;
  apellido: string | null;
  razon_social: string | null;
  dni: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  localidad: string | null;
  provincia: string | null;
  portal_activo: boolean;
  origen: string | null;
  created_at: string;
}

export async function getClientes(filters: ClienteFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.provincia) query = query.eq("provincia", filters.provincia);
  if (filters.portal_activo !== undefined)
    query = query.eq("portal_activo", filters.portal_activo);

  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.or(
      `nombre.ilike.%${s}%,apellido.ilike.%${s}%,razon_social.ilike.%${s}%,email.ilike.%${s}%,dni.ilike.%${s}%,cuit.ilike.%${s}%`,
    );
  }

  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getClientes: ${error.message}`);
  return (data ?? []) as unknown as ClienteRow[];
}

export async function getClientesCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (error) throw new Error(`getClientesCount: ${error.message}`);
  return count ?? 0;
}

export async function getClienteById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getClienteById: ${error.message}`);
  }
  return data;
}

/** Provincias presentes en la DB (para filtro select) */
export async function getProvinciasDistintas(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("provincia")
    .not("provincia", "is", null)
    .is("deleted_at", null);
  if (error) return [];
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.provincia) set.add(row.provincia);
  }
  return Array.from(set).sort();
}
