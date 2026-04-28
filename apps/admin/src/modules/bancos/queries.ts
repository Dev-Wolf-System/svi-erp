import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BancoFilters, BancoCondiciones } from "./schemas";

const LIST_COLUMNS = `
  id, nombre, contacto, telefono, email,
  condiciones, activo, created_at, updated_at
`;

export interface BancoRow {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  condiciones: BancoCondiciones;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export async function getBancos(filters: BancoFilters): Promise<BancoRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bancos")
    .select(LIST_COLUMNS)
    .order("nombre", { ascending: true });

  if (filters.activo !== undefined) query = query.eq("activo", filters.activo);

  if (filters.search) {
    const s = filters.search.replace(/[%_]/g, "");
    query = query.or(
      `nombre.ilike.%${s}%,contacto.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }

  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getBancos: ${error.message}`);
  return (data ?? []) as unknown as BancoRow[];
}

export async function getBancosCount(): Promise<{ total: number; activos: number }> {
  const supabase = await createClient();
  const [{ count: total }, { count: activos }] = await Promise.all([
    supabase.from("bancos").select("id", { count: "exact", head: true }),
    supabase
      .from("bancos")
      .select("id", { count: "exact", head: true })
      .eq("activo", true),
  ]);
  return { total: total ?? 0, activos: activos ?? 0 };
}

export async function getBancoById(id: string): Promise<BancoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bancos")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getBancoById: ${error.message}`);
  }
  return data as unknown as BancoRow;
}

/** Para el wizard de ventas: lista compacta de bancos activos */
export async function getBancosActivos(): Promise<
  Pick<BancoRow, "id" | "nombre" | "condiciones">[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre, condiciones")
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw new Error(`getBancosActivos: ${error.message}`);
  return (data ?? []) as unknown as Pick<BancoRow, "id" | "nombre" | "condiciones">[];
}
