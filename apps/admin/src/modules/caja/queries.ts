import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type {
  MovimientoRow,
  CierreRow,
  ResumenDia,
  TipoMovimiento,
  Moneda,
} from "./schemas";

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

// Cubre [desdeArt 00:00, hastaArt 23:59:59.999] en ART como ISO UTC
function rangoArtMulti(desdeArt: string, hastaArt: string): { desde: string; hasta: string } {
  return {
    desde: new Date(`${desdeArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${hastaArt}T23:59:59.999-03:00`).toISOString(),
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

// ─── Lista filtrable + paginada de movimientos ───────────────────────────────

export interface MovimientosFiltros {
  sucursalId:    string;
  desde:         string;  // YYYY-MM-DD (ART)
  hasta:         string;  // YYYY-MM-DD (ART)
  tipo?:         TipoMovimiento | "todos";
  categoria?:    string | "todas";
  moneda?:       Moneda | "todas";
  concepto?:     string;        // búsqueda LIKE case-insensitive
  registradoPor?: string;       // user_id
  page:          number;        // 1-based
  pageSize:      number;        // default 25
}

export interface MovimientosPagina {
  movimientos: MovimientoRow[];
  total:       number;
  page:        number;
  pageSize:    number;
  totalPages:  number;
}

export async function getMovimientosFiltrados(
  filtros: MovimientosFiltros,
): Promise<MovimientosPagina> {
  const claims = await getSviClaims();
  if (!claims) {
    return {
      movimientos: [],
      total: 0,
      page: filtros.page,
      pageSize: filtros.pageSize,
      totalPages: 0,
    };
  }

  const supabase = await createClient();
  const { desde, hasta } = rangoArtMulti(filtros.desde, filtros.hasta);
  const page = Math.max(1, filtros.page);
  const pageSize = Math.max(1, filtros.pageSize);
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  let query = supabase
    .from("movimientos_caja")
    .select(
      "id, sucursal_id, tipo, categoria, concepto, monto, moneda, fecha_operacion, registrado_por, comprobante_url, cierre_id, ref_tipo, ref_id, created_at",
      { count: "exact" },
    )
    .eq("empresa_id", claims.empresa_id)
    .eq("sucursal_id", filtros.sucursalId)
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null);

  if (filtros.tipo && filtros.tipo !== "todos") {
    query = query.eq("tipo", filtros.tipo);
  }
  if (filtros.categoria && filtros.categoria !== "todas") {
    query = query.eq("categoria", filtros.categoria);
  }
  if (filtros.moneda && filtros.moneda !== "todas") {
    query = query.eq("moneda", filtros.moneda);
  }
  if (filtros.concepto && filtros.concepto.trim().length > 0) {
    // Sanitizamos % y _ para evitar wildcards inyectados
    const sanitized = filtros.concepto.trim().replace(/[%_]/g, "");
    if (sanitized.length > 0) {
      query = query.ilike("concepto", `%${sanitized}%`);
    }
  }
  if (filtros.registradoPor && filtros.registradoPor.length > 0) {
    query = query.eq("registrado_por", filtros.registradoPor);
  }

  const { data, count } = await query
    .order("fecha_operacion", { ascending: false })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    movimientos: (data ?? []) as MovimientoRow[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getUsuariosRegistradores(
  sucursalId: string,
): Promise<Array<{ id: string; nombre: string }>> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();

  // 1. user_ids distintos que han registrado movimientos en esa sucursal
  const { data: movRows } = await supabase
    .from("movimientos_caja")
    .select("registrado_por")
    .eq("empresa_id", claims.empresa_id)
    .eq("sucursal_id", sucursalId)
    .not("registrado_por", "is", null)
    .is("deleted_at", null)
    .limit(1000);

  const ids = Array.from(
    new Set(
      ((movRows ?? []) as Array<{ registrado_por: string | null }>)
        .map((r) => r.registrado_por)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  if (ids.length === 0) return [];

  // 2. Joinear con usuarios para obtener nombre
  const { data: userRows } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido")
    .in("id", ids)
    .order("nombre", { ascending: true })
    .limit(50);

  const usuarios = ((userRows ?? []) as Array<{
    id: string;
    nombre: string;
    apellido: string | null;
  }>).map((u) => ({
    id:     u.id,
    nombre: [u.nombre, u.apellido].filter(Boolean).join(" ").trim() || u.nombre,
  }));

  return usuarios;
}
