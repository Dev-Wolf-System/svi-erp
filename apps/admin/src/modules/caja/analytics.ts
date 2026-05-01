import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO } from "./schemas";

// ─── Helpers de rango (ART = UTC-3, sin DST) ─────────────────────────────────

function rangoArt(fechaArt: string): { desde: string; hasta: string } {
  return {
    desde: new Date(`${fechaArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${fechaArt}T23:59:59.999-03:00`).toISOString(),
  };
}

function rangoArtMulti(desdeArt: string, hastaArt: string): { desde: string; hasta: string } {
  return {
    desde: new Date(`${desdeArt}T00:00:00-03:00`).toISOString(),
    hasta: new Date(`${hastaArt}T23:59:59.999-03:00`).toISOString(),
  };
}

function fechaArtFromDate(d: Date): string {
  // Devuelve YYYY-MM-DD en zona ART (UTC-3)
  const offsetMs = -3 * 60 * 60 * 1000;
  const shifted = new Date(d.getTime() + offsetMs);
  return shifted.toISOString().slice(0, 10);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return fechaArtFromDate(d);
}

// ─── Mapa de colores semánticos por categoría ────────────────────────────────

const COLOR_INGRESO: Record<string, string> = {
  venta_contado:     "#22C55E", // success
  venta_anticipo:    "#3B82F6", // info
  cobro_cuota:       "#22C55E",
  inversion_capital: "#C5A059", // gold
  transferencia:     "#3B82F6",
  otro_ingreso:      "#F59E0B", // warning suave
};

const COLOR_EGRESO: Record<string, string> = {
  compra_vehiculo:        "#EF4444", // error
  liquidacion_inversion:  "#F59E0B",
  gasto_operativo:        "#F59E0B",
  pago_proveedor:         "#EF4444",
  retiro:                 "#6B7280", // muted
  transferencia:          "#6B7280",
  otro_egreso:            "#6B7280",
};

const COLOR_FALLBACK = "#6B7280";

export function colorCategoria(tipo: "ingreso" | "egreso", categoria: string): string {
  const map = tipo === "ingreso" ? COLOR_INGRESO : COLOR_EGRESO;
  return map[categoria] ?? COLOR_FALLBACK;
}

function labelCategoria(tipo: "ingreso" | "egreso", value: string): string {
  const lista = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  return (lista as readonly { value: string; label: string }[]).find((c) => c.value === value)?.label ?? value;
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type SerieSaldoPunto = {
  date:     string;
  saldo:    number;
  ingresos: number;
  egresos:  number;
};

export type DistribucionCategoria = {
  categoria: string;
  total:     number;
  porcentaje: number;
  color:     string;
};

export type TopCategoria = {
  categoria: string;
  total:     number;
  count:     number;
  pct:       number;
};

export type DeltaPeriodo = {
  actual:   { ingresos: number; egresos: number; saldo: number; count: number };
  anterior: { ingresos: number; egresos: number; saldo: number; count: number };
  delta:    { ingresos: number; egresos: number; saldo: number; count: number }; // % de cambio
};

// ─── 1. Serie diaria de saldo ─────────────────────────────────────────────────

export async function getSaldoSerie(input: {
  sucursalId: string;
  diasAtras:  number;
}): Promise<SerieSaldoPunto[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const fechaDesde = diasAtras(input.diasAtras);
  const fechaHasta = diasAtras(0);
  const { desde, hasta } = rangoArtMulti(fechaDesde, fechaHasta);

  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto, moneda, fecha_operacion")
    .eq("empresa_id", claims.empresa_id)
    .eq("sucursal_id", input.sucursalId)
    .eq("moneda", "ARS")
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null)
    .order("fecha_operacion", { ascending: true });

  const rows = (data ?? []) as Array<{
    tipo: "ingreso" | "egreso";
    monto: number | string;
    moneda: string;
    fecha_operacion: string;
  }>;

  // Agrupar por día ART
  const buckets = new Map<string, { ingresos: number; egresos: number }>();

  // Inicializar todos los días del rango (incluso con 0)
  for (let i = input.diasAtras; i >= 0; i--) {
    const d = diasAtras(i);
    buckets.set(d, { ingresos: 0, egresos: 0 });
  }

  for (const row of rows) {
    const dayArt = fechaArtFromDate(new Date(row.fecha_operacion));
    const bucket = buckets.get(dayArt) ?? { ingresos: 0, egresos: 0 };
    if (row.tipo === "ingreso") bucket.ingresos += Number(row.monto);
    else bucket.egresos += Number(row.monto);
    buckets.set(dayArt, bucket);
  }

  // Convertir a serie con saldo acumulado
  const serie: SerieSaldoPunto[] = [];
  let acumulado = 0;
  const sorted = Array.from(buckets.keys()).sort();
  for (const date of sorted) {
    const b = buckets.get(date)!;
    const saldoDia = b.ingresos - b.egresos;
    acumulado += saldoDia;
    serie.push({
      date,
      saldo:    Number(acumulado.toFixed(2)),
      ingresos: Number(b.ingresos.toFixed(2)),
      egresos:  Number(b.egresos.toFixed(2)),
    });
  }
  return serie;
}

// ─── 2. Distribución por categoría ────────────────────────────────────────────

export async function getDistribucionCategorias(input: {
  sucursalId: string;
  desde:      string;
  hasta:      string;
  tipo?:      "ingreso" | "egreso";
}): Promise<DistribucionCategoria[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const { desde, hasta } = rangoArtMulti(input.desde, input.hasta);
  const supabase = await createClient();

  let query = supabase
    .from("movimientos_caja")
    .select("tipo, categoria, monto")
    .eq("empresa_id", claims.empresa_id)
    .eq("sucursal_id", input.sucursalId)
    .eq("moneda", "ARS")
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null);

  if (input.tipo) query = query.eq("tipo", input.tipo);

  const { data } = await query;
  const rows = (data ?? []) as Array<{ tipo: "ingreso" | "egreso"; categoria: string; monto: number | string }>;

  // Agrupar por categoría (incluye tipo en la key para evitar colisiones — ej "transferencia" en ambos tipos)
  const buckets = new Map<string, { tipo: "ingreso" | "egreso"; categoria: string; total: number }>();
  for (const row of rows) {
    const key = `${row.tipo}::${row.categoria}`;
    const prev = buckets.get(key);
    const monto = Number(row.monto);
    if (prev) prev.total += monto;
    else buckets.set(key, { tipo: row.tipo, categoria: row.categoria, total: monto });
  }

  const totalGeneral = Array.from(buckets.values()).reduce((s, b) => s + b.total, 0);
  if (totalGeneral === 0) return [];

  return Array.from(buckets.values())
    .map((b) => ({
      categoria:  labelCategoria(b.tipo, b.categoria),
      total:      Number(b.total.toFixed(2)),
      porcentaje: Number(((b.total / totalGeneral) * 100).toFixed(2)),
      color:      colorCategoria(b.tipo, b.categoria),
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── 3. Top N categorías ──────────────────────────────────────────────────────

export async function getTopCategorias(input: {
  sucursalId: string;
  desde:      string;
  hasta:      string;
  tipo:       "ingreso" | "egreso";
  limit?:     number;
}): Promise<TopCategoria[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const limit = input.limit ?? 5;
  const { desde, hasta } = rangoArtMulti(input.desde, input.hasta);
  const supabase = await createClient();

  const { data } = await supabase
    .from("movimientos_caja")
    .select("categoria, monto")
    .eq("empresa_id", claims.empresa_id)
    .eq("sucursal_id", input.sucursalId)
    .eq("tipo", input.tipo)
    .eq("moneda", "ARS")
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null);

  const rows = (data ?? []) as Array<{ categoria: string; monto: number | string }>;

  const buckets = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const prev = buckets.get(row.categoria) ?? { total: 0, count: 0 };
    prev.total += Number(row.monto);
    prev.count += 1;
    buckets.set(row.categoria, prev);
  }

  const totalGeneral = Array.from(buckets.values()).reduce((s, b) => s + b.total, 0);
  if (totalGeneral === 0) return [];

  return Array.from(buckets.entries())
    .map(([categoria, b]) => ({
      categoria: labelCategoria(input.tipo, categoria),
      total:     Number(b.total.toFixed(2)),
      count:     b.count,
      pct:       Number(((b.total / totalGeneral) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ─── 4. Delta entre periodos ──────────────────────────────────────────────────

function pct(actual: number, anterior: number): number {
  if (anterior === 0) return actual === 0 ? 0 : 100;
  return Number((((actual - anterior) / Math.abs(anterior)) * 100).toFixed(2));
}

function diasEntre(desdeArt: string, hastaArt: string): number {
  const a = new Date(`${desdeArt}T00:00:00-03:00`);
  const b = new Date(`${hastaArt}T23:59:59.999-03:00`);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function shiftFecha(fechaArt: string, dias: number): string {
  const d = new Date(`${fechaArt}T00:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return fechaArtFromDate(d);
}

async function totalesEnRango(
  sucursalId: string,
  empresaId: string,
  desdeArt: string,
  hastaArt: string,
): Promise<{ ingresos: number; egresos: number; saldo: number; count: number }> {
  const { desde, hasta } = rangoArtMulti(desdeArt, hastaArt);
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto")
    .eq("empresa_id", empresaId)
    .eq("sucursal_id", sucursalId)
    .eq("moneda", "ARS")
    .gte("fecha_operacion", desde)
    .lte("fecha_operacion", hasta)
    .is("deleted_at", null);

  const rows = (data ?? []) as Array<{ tipo: "ingreso" | "egreso"; monto: number | string }>;
  let ingresos = 0;
  let egresos = 0;
  for (const r of rows) {
    if (r.tipo === "ingreso") ingresos += Number(r.monto);
    else egresos += Number(r.monto);
  }
  return {
    ingresos: Number(ingresos.toFixed(2)),
    egresos:  Number(egresos.toFixed(2)),
    saldo:    Number((ingresos - egresos).toFixed(2)),
    count:    rows.length,
  };
}

export async function getDeltaPeriodos(input: {
  sucursalId: string;
  desde:      string;
  hasta:      string;
}): Promise<DeltaPeriodo> {
  const claims = await getSviClaims();
  const empty = { ingresos: 0, egresos: 0, saldo: 0, count: 0 };
  if (!claims) {
    return { actual: empty, anterior: empty, delta: empty };
  }

  const dias = diasEntre(input.desde, input.hasta);
  // Periodo anterior: mismo largo, justo antes
  const anteriorHasta = shiftFecha(input.desde, -1);
  const anteriorDesde = shiftFecha(anteriorHasta, -(dias - 1));

  const [actual, anterior] = await Promise.all([
    totalesEnRango(input.sucursalId, claims.empresa_id, input.desde, input.hasta),
    totalesEnRango(input.sucursalId, claims.empresa_id, anteriorDesde, anteriorHasta),
  ]);

  return {
    actual,
    anterior,
    delta: {
      ingresos: pct(actual.ingresos, anterior.ingresos),
      egresos:  pct(actual.egresos,  anterior.egresos),
      saldo:    pct(actual.saldo,    anterior.saldo),
      count:    pct(actual.count,    anterior.count),
    },
  };
}
