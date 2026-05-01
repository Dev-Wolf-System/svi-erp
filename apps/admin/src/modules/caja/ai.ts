import "server-only";
import { generateInsights } from "@/modules/ai/insights";
import { detectAnomalies } from "@/modules/ai/anomalies";
import { generateForecast } from "@/modules/ai/forecast";
import { getSviClaims } from "@/lib/auth/claims";
import { createClient } from "@/lib/supabase/server";
import type {
  InsightsResponse,
  ForecastResponse,
  AnomaliesResponse,
} from "@/modules/ai/schemas";
import {
  getSaldoSerie,
  getTopCategorias,
  getDeltaPeriodos,
} from "./analytics";
import { getResumenDia } from "./queries";
import type { MovimientoRow } from "./schemas";

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function fechaArtFromDate(d: Date): string {
  const offsetMs = -3 * 60 * 60 * 1000;
  const shifted = new Date(d.getTime() + offsetMs);
  return shifted.toISOString().slice(0, 10);
}

function shiftFecha(fechaArt: string, dias: number): string {
  const d = new Date(`${fechaArt}T00:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return fechaArtFromDate(d);
}

// ─── Insights ────────────────────────────────────────────────────────────────

export async function getCajaInsights(input: {
  sucursalId: string;
  fecha:      string;
  fresh?:     boolean;
}): Promise<InsightsResponse | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  const ayer = shiftFecha(input.fecha, -1);

  try {
    const [resumenHoy, topIng, topEgr, delta] = await Promise.all([
      getResumenDia(input.sucursalId, input.fecha),
      getTopCategorias({
        sucursalId: input.sucursalId,
        desde:      input.fecha,
        hasta:      input.fecha,
        tipo:       "ingreso",
        limit:      3,
      }),
      getTopCategorias({
        sucursalId: input.sucursalId,
        desde:      input.fecha,
        hasta:      input.fecha,
        tipo:       "egreso",
        limit:      3,
      }),
      getDeltaPeriodos({
        sucursalId: input.sucursalId,
        desde:      ayer,
        hasta:      ayer,
      }),
    ]);

    const contextData = {
      fecha: input.fecha,
      resumen: {
        total_ingresos: resumenHoy.total_ingresos,
        total_egresos:  resumenHoy.total_egresos,
        saldo:          resumenHoy.saldo,
        count:          resumenHoy.count,
        cerrado:        resumenHoy.cerrado,
      },
      topCategoriasIngreso: topIng,
      topCategoriasEgreso:  topEgr,
      deltaVsAyer: delta,
    };

    return await generateInsights({
      empresaId:   claims.empresa_id,
      userId:      claims.sub,
      moduleKey:   "caja",
      scope:       "day",
      fresh:       input.fresh,
      contextData,
    });
  } catch {
    return null;
  }
}

// ─── Forecast de saldo ────────────────────────────────────────────────────────

export async function getCajaForecast(input: {
  sucursalId:    string;
  diasHistoria?: number;
  diasHorizon?:  number;
}): Promise<{ historical: Array<{ date: string; value: number }>; forecast: ForecastResponse } | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  const diasHistoria = input.diasHistoria ?? 30;
  const diasHorizon  = input.diasHorizon  ?? 30;

  try {
    const serie = await getSaldoSerie({
      sucursalId: input.sucursalId,
      diasAtras:  diasHistoria,
    });

    // Forecast schema requiere mínimo 7 puntos
    if (serie.length < 7) return null;

    const historical = serie.map((p) => ({ date: p.date, value: p.saldo }));

    const forecast = await generateForecast({
      empresaId: claims.empresa_id,
      userId:    claims.sub,
      request:   {
        moduleKey:   "caja",
        metric:      "saldo",
        historical,
        horizonDays: diasHorizon,
      },
    });

    return { historical, forecast };
  } catch {
    return null;
  }
}

// ─── Anomalías sobre montos del día vs histórico ─────────────────────────────

export async function getCajaAnomalias(input: {
  sucursalId: string;
  desde:      string;
  hasta:      string;
}): Promise<AnomaliesResponse | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  try {
    // Histórico de 90 días (excluyendo el rango actual) para baseline
    const historiaDesde = shiftFecha(input.desde, -90);
    const historiaHasta = shiftFecha(input.desde, -1);

    const [actuales, historicos] = await Promise.all([
      getMovimientosDiaRange(input.sucursalId, input.desde, input.hasta),
      getMovimientosDiaRange(input.sucursalId, historiaDesde, historiaHasta),
    ]);

    if (historicos.length < 5) return { anomalies: [] };

    const history = historicos
      .filter((m) => m.moneda === "ARS")
      .map((m) => Number(m.monto))
      .filter((v) => Number.isFinite(v));

    const current = actuales
      .filter((m) => m.moneda === "ARS")
      .map((m) => ({
        entityId: m.id,
        value:    Number(m.monto),
        label:    m.concepto,
      }));

    if (history.length < 3 || current.length === 0) return { anomalies: [] };

    return await detectAnomalies({
      empresaId: claims.empresa_id,
      userId:    claims.sub,
      request:   {
        moduleKey: "caja",
        current,
        history,
        threshold: 2.5,
      },
    });
  } catch {
    return null;
  }
}

// ─── helper local: movimientos en rango (multi-día) ──────────────────────────

async function getMovimientosDiaRange(
  sucursalId: string,
  desdeArt:   string,
  hastaArt:   string,
): Promise<MovimientoRow[]> {
  const desde = new Date(`${desdeArt}T00:00:00-03:00`).toISOString();
  const hasta = new Date(`${hastaArt}T23:59:59.999-03:00`).toISOString();
  const supabase = await createClient();
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

