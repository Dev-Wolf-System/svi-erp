import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { MovimientoRow, CierreRow, ResumenDia } from "./schemas";

// Argentina siempre UTC-3 (no tiene DST)
export function artFecha(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

// Devuelve [desde, hasta) en ISO UTC que cubren el día completo en ART
function rangoArt(fechaArt: string): { desde: string; hasta: string } {
  return {
    desde: new Date(`${fechaArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${fechaArt}T23:59:59.999-03:00`).toISOString(),
  };
}

export async function getSucursalesAccesibles(): Promise<
  { id: string; nombre: string }[]
> {
  const claims = await getSviClaims();
  if (!claims) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("empresa_id", claims.empresa_id)
    .order("nombre");
  return (data ?? []) as { id: string; nombre: string }[];
}

export async function getMovimientosDia(
  sucursalId: string,
  fechaArt: string,
): Promise<MovimientoRow[]> {
  const supabase = await createClient();
  const { desde, hasta } = rangoArt(fechaArt);
  const { data } = await supabase
    .from("movimientos_caja")
    .select(
      "id, sucursal_id, tipo, categoria, concepto, monto, moneda, fecha_operacion, registrado_por, comprobante_url, cierre_id, ref_tipo, ref_id, created_at",
    )
    .eq("sucursal_id", sucursalId)
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null)
    .order("fecha_operacion", { ascending: false });
  return (data ?? []) as MovimientoRow[];
}

export async function getCierreDia(
  sucursalId: string,
  fechaArt: string,
): Promise<CierreRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cierres_caja")
    .select("id, sucursal_id, fecha, total_ingresos, total_egresos, saldo, cerrado_por, observaciones, created_at")
    .eq("sucursal_id", sucursalId)
    .eq("fecha", fechaArt)
    .maybeSingle();
  return (data as CierreRow | null) ?? null;
}

export async function getResumenDia(
  sucursalId: string,
  fechaArt: string,
): Promise<ResumenDia> {
  const [movimientos, cierre] = await Promise.all([
    getMovimientosDia(sucursalId, fechaArt),
    getCierreDia(sucursalId, fechaArt),
  ]);

  let totalIngresos = 0;
  let totalEgresos = 0;
  for (const m of movimientos) {
    if (m.moneda !== "ARS") continue; // solo ARS en el resumen principal
    if (m.tipo === "ingreso") totalIngresos += Number(m.monto);
    else totalEgresos += Number(m.monto);
  }

  return {
    total_ingresos: totalIngresos,
    total_egresos:  totalEgresos,
    saldo:          totalIngresos - totalEgresos,
    count:          movimientos.length,
    cerrado:        cierre !== null,
    cierre,
  };
}

// Historial de cierres (últimos N días)
export async function getCierresRecientes(
  sucursalId: string,
  limite = 30,
): Promise<CierreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cierres_caja")
    .select("id, sucursal_id, fecha, total_ingresos, total_egresos, saldo, cerrado_por, observaciones, created_at")
    .eq("sucursal_id", sucursalId)
    .order("fecha", { ascending: false })
    .limit(limite);
  return (data ?? []) as CierreRow[];
}
