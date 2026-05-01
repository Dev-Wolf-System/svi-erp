"use server";

import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getDatosArqueoDia,
  getDatosCierreMensual,
  type DatosArqueoDia,
  type DatosCierreMensual,
} from "@/modules/caja/reportes";
import {
  generarNarrativaReporte,
  type ReporteHighlight,
} from "@/modules/caja/reportes-actions";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ReporteArqueoOutput {
  kind:        "arqueo_diario";
  data:        DatosArqueoDia;
  narrative:   string | null;
  highlights:  ReporteHighlight[];
  iaError:     string | null;
}

export interface ReporteMensualOutput {
  kind:        "cierre_mensual";
  data:        DatosCierreMensual;
  narrative:   string | null;
  highlights:  ReporteHighlight[];
  iaError:     string | null;
}

export type ReporteCompletoResult =
  | { ok: true; data: ReporteArqueoOutput | ReporteMensualOutput }
  | { ok: false; error: string };

// ─── Wrapper: arqueo del día ─────────────────────────────────────────────────

export async function generarReporteArqueoDia(input: {
  sucursalId: string;
  fecha:      string; // YYYY-MM-DD ART
}): Promise<ReporteCompletoResult> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("caja.view_propia", claims.rol)) {
    return { ok: false, error: "Sin permisos" };
  }

  const datos = await getDatosArqueoDia(input);
  if (!datos) return { ok: false, error: "No se pudieron cargar los datos" };

  let narrative: string | null = null;
  let highlights: ReporteHighlight[] = [];
  let iaError: string | null = null;

  if (can("ia.report", claims.rol)) {
    const ai = await generarNarrativaReporte({
      reportType: "arqueo_diario",
      period:     { from: input.fecha, to: input.fecha },
      data:       datos,
    });
    if (ai.ok) {
      narrative  = ai.data.narrative;
      highlights = ai.data.highlights;
    } else {
      iaError = ai.error;
    }
  }

  return {
    ok: true,
    data: {
      kind: "arqueo_diario",
      data: datos,
      narrative,
      highlights,
      iaError,
    },
  };
}

// ─── Wrapper: cierre mensual ─────────────────────────────────────────────────

export async function generarReporteCierreMensual(input: {
  sucursalId: string;
  mes:        string; // YYYY-MM
}): Promise<ReporteCompletoResult> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };
  if (!can("caja.view_propia", claims.rol)) {
    return { ok: false, error: "Sin permisos" };
  }

  if (!/^\d{4}-\d{2}$/.test(input.mes)) {
    return { ok: false, error: "Mes inválido (formato esperado: YYYY-MM)" };
  }

  const datos = await getDatosCierreMensual(input);
  if (!datos) return { ok: false, error: "No se pudieron cargar los datos" };

  let narrative: string | null = null;
  let highlights: ReporteHighlight[] = [];
  let iaError: string | null = null;

  if (can("ia.report", claims.rol)) {
    const ai = await generarNarrativaReporte({
      reportType: "cierre_mensual",
      period:     { from: datos.desde, to: datos.hasta },
      data:       datos,
    });
    if (ai.ok) {
      narrative  = ai.data.narrative;
      highlights = ai.data.highlights;
    } else {
      iaError = ai.error;
    }
  }

  return {
    ok: true,
    data: {
      kind: "cierre_mensual",
      data: datos,
      narrative,
      highlights,
      iaError,
    },
  };
}
