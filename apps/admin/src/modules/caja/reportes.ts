import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getMovimientosFiltrados,
  getResumenDia,
  getMovimientosDia,
  getCierreDia,
} from "./queries";
import {
  getDistribucionCategorias,
  getTopCategorias,
  getDeltaPeriodos,
} from "./analytics";
import type { MovimientoRow } from "./schemas";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface DatosArqueoDia {
  sucursal:    { id: string; nombre: string };
  fecha:       string; // YYYY-MM-DD ART
  resumen:     {
    total_ingresos: number;
    total_egresos:  number;
    saldo:          number;
    count:          number;
  };
  movimientos: MovimientoRow[];
  topIngreso:  Array<{ categoria: string; total: number; count: number; pct: number }>;
  topEgreso:   Array<{ categoria: string; total: number; count: number; pct: number }>;
  cierre:      {
    id:            string;
    cerrado_por:   string | null;
    observaciones: string | null;
    created_at:    string;
  } | null;
}

export interface DatosCierreMensual {
  sucursal: { id: string; nombre: string };
  desde:    string; // YYYY-MM-DD ART
  hasta:    string; // YYYY-MM-DD ART
  totales:  { ingresos: number; egresos: number; saldo: number; count: number };
  porCategoria: {
    ingresos: Array<{ categoria: string; total: number; pct: number; color: string }>;
    egresos:  Array<{ categoria: string; total: number; pct: number; color: string }>;
  };
  comparativaAnterior: {
    ingresos: number;
    egresos:  number;
    saldo:    number;
    deltaPct: { ingresos: number; egresos: number; saldo: number };
  };
  diasOperados:   number;
  promedioDiario: { ingresos: number; egresos: number; saldo: number };
}

// ─── Helpers internos ────────────────────────────────────────────────────────

async function getNombreSucursal(sucursalId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sucursales")
    .select("nombre")
    .eq("id", sucursalId)
    .maybeSingle();
  return (data as { nombre?: string } | null)?.nombre ?? "—";
}

function rangoMes(mes: string): { desde: string; hasta: string } {
  // mes = "YYYY-MM"
  const [y, m] = mes.split("-").map(Number);
  const year = y!;
  const month = m!; // 1-12
  const desde = `${mes}-01`;
  // Día 0 del mes siguiente = último día del mes actual (UTC seguro)
  const last = new Date(Date.UTC(year, month, 0));
  const dd = String(last.getUTCDate()).padStart(2, "0");
  const hasta = `${mes}-${dd}`;
  return { desde, hasta };
}

function diasUnicosOperados(mov: MovimientoRow[]): number {
  const set = new Set<string>();
  for (const m of mov) {
    // YYYY-MM-DD en ART (UTC-3)
    const d = new Date(m.fecha_operacion);
    const offsetMs = -3 * 60 * 60 * 1000;
    const shifted = new Date(d.getTime() + offsetMs);
    set.add(shifted.toISOString().slice(0, 10));
  }
  return set.size;
}

// ─── Datos para arqueo del día ───────────────────────────────────────────────

export async function getDatosArqueoDia(input: {
  sucursalId: string;
  fecha:      string; // YYYY-MM-DD ART
}): Promise<DatosArqueoDia | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  const [nombre, resumen, movimientos, topIngreso, topEgreso] = await Promise.all([
    getNombreSucursal(input.sucursalId),
    getResumenDia(input.sucursalId, input.fecha),
    getMovimientosDia(input.sucursalId, input.fecha),
    getTopCategorias({
      sucursalId: input.sucursalId,
      desde:      input.fecha,
      hasta:      input.fecha,
      tipo:       "ingreso",
      limit:      5,
    }),
    getTopCategorias({
      sucursalId: input.sucursalId,
      desde:      input.fecha,
      hasta:      input.fecha,
      tipo:       "egreso",
      limit:      5,
    }),
  ]);

  const cierreRow = resumen.cierre ?? (await getCierreDia(input.sucursalId, input.fecha));

  return {
    sucursal: { id: input.sucursalId, nombre },
    fecha:    input.fecha,
    resumen: {
      total_ingresos: resumen.total_ingresos,
      total_egresos:  resumen.total_egresos,
      saldo:          resumen.saldo,
      count:          resumen.count,
    },
    movimientos,
    topIngreso,
    topEgreso,
    cierre: cierreRow
      ? {
          id:            cierreRow.id,
          cerrado_por:   cierreRow.cerrado_por,
          observaciones: cierreRow.observaciones,
          created_at:    cierreRow.created_at,
        }
      : null,
  };
}

// ─── Datos para cierre mensual ───────────────────────────────────────────────

export async function getDatosCierreMensual(input: {
  sucursalId: string;
  mes:        string; // YYYY-MM
}): Promise<DatosCierreMensual | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  if (!/^\d{4}-\d{2}$/.test(input.mes)) return null;

  const { desde, hasta } = rangoMes(input.mes);
  const [nombre, distIng, distEgr, delta, paginaTodos] = await Promise.all([
    getNombreSucursal(input.sucursalId),
    getDistribucionCategorias({
      sucursalId: input.sucursalId,
      desde,
      hasta,
      tipo:       "ingreso",
    }),
    getDistribucionCategorias({
      sucursalId: input.sucursalId,
      desde,
      hasta,
      tipo:       "egreso",
    }),
    getDeltaPeriodos({ sucursalId: input.sucursalId, desde, hasta }),
    // Sólo necesitamos los movimientos para contar días operados (ARS) — usamos page grande
    getMovimientosFiltrados({
      sucursalId: input.sucursalId,
      desde,
      hasta,
      page:       1,
      pageSize:   10000,
    }),
  ]);

  const movimientosArs = paginaTodos.movimientos.filter((m) => m.moneda === "ARS");
  const diasOperados = diasUnicosOperados(movimientosArs);
  const divisor = diasOperados > 0 ? diasOperados : 1;

  const totales = {
    ingresos: delta.actual.ingresos,
    egresos:  delta.actual.egresos,
    saldo:    delta.actual.saldo,
    count:    delta.actual.count,
  };

  return {
    sucursal: { id: input.sucursalId, nombre },
    desde,
    hasta,
    totales,
    porCategoria: {
      ingresos: distIng.map((d) => ({
        categoria: d.categoria,
        total:     d.total,
        pct:       d.porcentaje,
        color:     d.color,
      })),
      egresos: distEgr.map((d) => ({
        categoria: d.categoria,
        total:     d.total,
        pct:       d.porcentaje,
        color:     d.color,
      })),
    },
    comparativaAnterior: {
      ingresos: delta.anterior.ingresos,
      egresos:  delta.anterior.egresos,
      saldo:    delta.anterior.saldo,
      deltaPct: {
        ingresos: delta.delta.ingresos,
        egresos:  delta.delta.egresos,
        saldo:    delta.delta.saldo,
      },
    },
    diasOperados,
    promedioDiario: {
      ingresos: Number((totales.ingresos / divisor).toFixed(2)),
      egresos:  Number((totales.egresos  / divisor).toFixed(2)),
      saldo:    Number((totales.saldo    / divisor).toFixed(2)),
    },
  };
}
