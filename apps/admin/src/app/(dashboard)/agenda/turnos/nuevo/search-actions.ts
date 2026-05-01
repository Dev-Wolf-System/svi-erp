"use server";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { PersonaTipo } from "@/modules/agenda";

export type PersonaOption = {
  id: string;
  label: string;
  sublabel?: string;
};

export async function buscarPersonas(
  tipo: PersonaTipo,
  q: string,
): Promise<PersonaOption[]> {
  if (tipo === "externo") return [];
  const claims = await getSviClaims();
  if (!claims) return [];

  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;

  const supabase = await createClient();

  if (tipo === "cliente") {
    const { data } = await supabase
      .from("clientes")
      .select("id, tipo, nombre, apellido, razon_social, telefono, celular")
      .eq("empresa_id", claims.empresa_id)
      .is("deleted_at", null)
      .or(`nombre.ilike.${like},apellido.ilike.${like},razon_social.ilike.${like}`)
      .limit(10);
    return (data ?? []).map((c) => ({
      id: c.id,
      label:
        c.tipo === "empresa"
          ? (c.razon_social ?? "Empresa sin nombre")
          : `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || "Sin nombre",
      sublabel: (c.telefono ?? c.celular) || undefined,
    }));
  }

  if (tipo === "inversor") {
    const { data } = await supabase
      .from("inversores")
      .select("id, nombre, email, telefono")
      .eq("empresa_id", claims.empresa_id)
      .is("deleted_at", null)
      .or(`nombre.ilike.${like},email.ilike.${like}`)
      .limit(10);
    return (data ?? []).map((i) => ({
      id: i.id,
      label: i.nombre,
      sublabel: (i.email ?? i.telefono) || undefined,
    }));
  }

  // lead
  const { data } = await supabase
    .from("leads")
    .select("id, nombre, telefono, origen")
    .eq("empresa_id", claims.empresa_id)
    .or(`nombre.ilike.${like},telefono.ilike.${like}`)
    .limit(10);
  return (data ?? []).map((l) => ({
    id: l.id,
    label: l.nombre || l.telefono || "Sin nombre",
    sublabel: (l.telefono ?? l.origen) || undefined,
  }));
}

export async function getPersonaLabel(
  tipo: PersonaTipo,
  id: string,
): Promise<string | null> {
  if (tipo === "externo" || !id) return null;
  const claims = await getSviClaims();
  if (!claims) return null;

  const supabase = await createClient();

  if (tipo === "cliente") {
    const { data } = await supabase
      .from("clientes")
      .select("tipo, nombre, apellido, razon_social")
      .eq("id", id)
      .single();
    if (!data) return null;
    return data.tipo === "empresa"
      ? (data.razon_social ?? "Empresa")
      : `${data.nombre ?? ""} ${data.apellido ?? ""}`.trim() || "Cliente";
  }

  if (tipo === "inversor") {
    const { data } = await supabase
      .from("inversores")
      .select("nombre")
      .eq("id", id)
      .single();
    return data?.nombre ?? null;
  }

  const { data } = await supabase
    .from("leads")
    .select("nombre, telefono")
    .eq("id", id)
    .single();
  if (!data) return null;
  return data.nombre || data.telefono || "Lead";
}
