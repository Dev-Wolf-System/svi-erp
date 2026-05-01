"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Calendar, CalendarRange, Download, FileSpreadsheet, Loader2,
  Sparkles, AlertTriangle, ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import { AiNarrativeBlock } from "@/components/ai/ai-narrative-block";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { exportarMovimientosCSV } from "@/modules/caja/reportes-actions";
import {
  generarReporteArqueoDia,
  generarReporteCierreMensual,
  type ReporteArqueoOutput,
  type ReporteMensualOutput,
} from "./actions";

type Tab = "arqueo" | "mensual" | "csv";

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayArt(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function currentMonthArt(): string {
  return todayArt().slice(0, 7);
}

function fmtMoneda(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:    "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour:     "2-digit",
    minute:   "2-digit",
  });
}

function fmtMes(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${meses[m - 1]} ${y}`;
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

interface Props {
  sucursalId:     string;
  sucursalNombre: string;
  puedeIa:        boolean;
}

export function ReportesShell({ sucursalId, sucursalNombre, puedeIa }: Props) {
  const [tab, setTab] = useState<Tab>("arqueo");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-svi-border-muted pb-2">
        <TabButton active={tab === "arqueo"} onClick={() => setTab("arqueo")} icon={Calendar}>
          Arqueo del día
        </TabButton>
        <TabButton active={tab === "mensual"} onClick={() => setTab("mensual")} icon={CalendarRange}>
          Cierre mensual
        </TabButton>
        <TabButton active={tab === "csv"} onClick={() => setTab("csv")} icon={FileSpreadsheet}>
          Export CSV
        </TabButton>
      </div>

      {tab === "arqueo" && (
        <ArqueoTab sucursalId={sucursalId} sucursalNombre={sucursalNombre} puedeIa={puedeIa} />
      )}
      {tab === "mensual" && (
        <MensualTab sucursalId={sucursalId} sucursalNombre={sucursalNombre} puedeIa={puedeIa} />
      )}
      {tab === "csv" && <CsvTab sucursalId={sucursalId} />}
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 -mb-2 text-sm font-medium transition ${
        active
          ? "border-svi-gold text-svi-gold"
          : "border-transparent text-svi-muted hover:text-svi-white"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

// ─── Tab: Arqueo del día ─────────────────────────────────────────────────────

function ArqueoTab({
  sucursalId, sucursalNombre, puedeIa,
}: {
  sucursalId: string;
  sucursalNombre: string;
  puedeIa: boolean;
}) {
  const [fecha, setFecha] = useState(todayArt());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReporteArqueoOutput | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  function handleGenerar() {
    startTransition(async () => {
      const res = await generarReporteArqueoDia({ sucursalId, fecha });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.kind !== "arqueo_diario") return;
      setResult(res.data);
      if (res.data.iaError) {
        toast.warning(`Reporte generado, IA falló: ${res.data.iaError}`);
      } else if (res.data.narrative) {
        toast.success("Reporte generado");
      } else {
        toast.success("Reporte generado");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-svi-card border border-svi-border-muted rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-svi-white mb-1">Arqueo del día</h2>
        <p className="text-xs text-svi-muted mb-4">
          Resumen consolidado de los movimientos de un día específico, con narrativa IA.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-svi-muted uppercase tracking-wider">Fecha</span>
            <input
              type="date"
              value={fecha}
              max={todayArt()}
              onChange={(e) => setFecha(e.target.value)}
              className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            disabled={pending || !fecha}
            onClick={handleGenerar}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-svi-gold text-svi-black text-sm font-semibold hover:bg-svi-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generando reporte...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generar reporte
              </>
            )}
          </button>
        </div>
        {!puedeIa && (
          <p className="mt-3 text-[11px] text-svi-muted-2 flex items-center gap-1.5">
            <AlertTriangle className="size-3" />
            Tu rol no incluye narrativa IA. Vas a ver los datos crudos.
          </p>
        )}
      </div>

      {result && (
        <div ref={resultRef} className="space-y-4">
          <ResultadoArqueo data={result} sucursalNombre={sucursalNombre} />
        </div>
      )}
    </div>
  );
}

function ResultadoArqueo({
  data, sucursalNombre,
}: {
  data: ReporteArqueoOutput;
  sucursalNombre: string;
}) {
  const { resumen, movimientos, topIngreso, topEgreso, cierre } = data.data;

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-svi-white">
          Arqueo · {sucursalNombre} · <span className="font-mono">{data.data.fecha}</span>
        </h3>
        {cierre && (
          <span className="text-xs text-svi-warning flex items-center gap-1">
            Cerrado a las {fmtHora(cierre.created_at)}
          </span>
        )}
      </div>

      {data.narrative ? (
        <AiNarrativeBlock title="Resumen ejecutivo IA" content={data.narrative} />
      ) : data.iaError ? (
        <div className="rounded-xl border border-svi-warning/30 bg-svi-warning/5 p-3 text-xs text-svi-warning flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">No se pudo generar narrativa IA</p>
            <p className="text-svi-warning/80">{data.iaError}</p>
          </div>
        </div>
      ) : null}

      {/* Highlights / KPI cards generados por IA */}
      {data.highlights.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {data.highlights.map((h, i) => (
            <div key={i} className="rounded-xl border border-svi-border-muted bg-svi-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-svi-muted">{h.label}</p>
              <p className="text-base font-semibold text-svi-white mt-1 tabular-nums">{h.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resumen base (siempre visible, datos crudos) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiSimple label="Ingresos" value={fmtMoneda(resumen.total_ingresos)} accent="success" />
        <KpiSimple label="Egresos" value={fmtMoneda(resumen.total_egresos)} accent="error" />
        <KpiSimple
          label="Saldo"
          value={fmtMoneda(resumen.saldo)}
          accent={resumen.saldo >= 0 ? "gold" : "error"}
        />
        <KpiSimple label="Movimientos" value={String(resumen.count)} accent="info" />
      </div>

      {/* Top categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCategoriaTable
          title="Top ingresos por categoría"
          rows={topIngreso}
          accent="success"
          icon={<ArrowUpCircle className="size-4" />}
        />
        <TopCategoriaTable
          title="Top egresos por categoría"
          rows={topEgreso}
          accent="error"
          icon={<ArrowDownCircle className="size-4" />}
        />
      </div>

      {/* Tabla de movimientos */}
      <section>
        <h4 className="text-sm font-semibold text-svi-muted uppercase tracking-wider mb-2">
          Movimientos del día
        </h4>
        {movimientos.length === 0 ? (
          <div className="text-center py-8 text-svi-muted-2 border border-dashed border-svi-border-muted rounded-2xl">
            <p className="text-sm">Sin movimientos registrados.</p>
          </div>
        ) : (
          <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted text-svi-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-svi-border-muted/50 last:border-0 ${
                      i % 2 === 0 ? "" : "bg-svi-elevated/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-svi-muted-2 tabular-nums whitespace-nowrap">
                      {fmtHora(m.fecha_operacion)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          m.tipo === "ingreso" ? "text-svi-success" : "text-svi-error"
                        }`}
                      >
                        {m.tipo === "ingreso" ? (
                          <ArrowUpCircle className="size-3.5" />
                        ) : (
                          <ArrowDownCircle className="size-3.5" />
                        )}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-svi-white max-w-[300px] truncate">
                      {m.concepto}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        m.tipo === "ingreso" ? "text-svi-success" : "text-svi-error"
                      }`}
                    >
                      {m.moneda !== "ARS" && (
                        <span className="text-xs font-normal text-svi-muted mr-1">{m.moneda}</span>
                      )}
                      {m.tipo === "ingreso" ? "+" : "-"}
                      {fmtMoneda(Number(m.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ─── Tab: Cierre mensual ─────────────────────────────────────────────────────

function MensualTab({
  sucursalId, sucursalNombre, puedeIa,
}: {
  sucursalId: string;
  sucursalNombre: string;
  puedeIa: boolean;
}) {
  const [mes, setMes] = useState(currentMonthArt());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReporteMensualOutput | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  function handleGenerar() {
    startTransition(async () => {
      const res = await generarReporteCierreMensual({ sucursalId, mes });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.kind !== "cierre_mensual") return;
      setResult(res.data);
      if (res.data.iaError) {
        toast.warning(`Reporte generado, IA falló: ${res.data.iaError}`);
      } else {
        toast.success("Reporte generado");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-svi-card border border-svi-border-muted rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-svi-white mb-1">Cierre mensual</h2>
        <p className="text-xs text-svi-muted mb-4">
          Consolidado del mes con comparativa contra el período anterior.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-svi-muted uppercase tracking-wider">Mes</span>
            <input
              type="month"
              value={mes}
              max={currentMonthArt()}
              onChange={(e) => setMes(e.target.value)}
              className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            disabled={pending || !mes}
            onClick={handleGenerar}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-svi-gold text-svi-black text-sm font-semibold hover:bg-svi-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generando reporte...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generar reporte
              </>
            )}
          </button>
        </div>
        {!puedeIa && (
          <p className="mt-3 text-[11px] text-svi-muted-2 flex items-center gap-1.5">
            <AlertTriangle className="size-3" />
            Tu rol no incluye narrativa IA. Vas a ver los datos crudos.
          </p>
        )}
      </div>

      {result && (
        <div ref={resultRef} className="space-y-4">
          <ResultadoMensual data={result} sucursalNombre={sucursalNombre} />
        </div>
      )}
    </div>
  );
}

function ResultadoMensual({
  data, sucursalNombre,
}: {
  data: ReporteMensualOutput;
  sucursalNombre: string;
}) {
  const d = data.data;
  const mes = d.desde.slice(0, 7);

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-svi-white capitalize">
          Cierre mensual · {sucursalNombre} · {fmtMes(mes)}
        </h3>
      </div>

      {data.narrative ? (
        <AiNarrativeBlock title="Resumen ejecutivo IA" content={data.narrative} />
      ) : data.iaError ? (
        <div className="rounded-xl border border-svi-warning/30 bg-svi-warning/5 p-3 text-xs text-svi-warning flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">No se pudo generar narrativa IA</p>
            <p className="text-svi-warning/80">{data.iaError}</p>
          </div>
        </div>
      ) : null}

      {/* Highlights generados por IA */}
      {data.highlights.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {data.highlights.map((h, i) => (
            <div key={i} className="rounded-xl border border-svi-border-muted bg-svi-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-svi-muted">{h.label}</p>
              <p className="text-base font-semibold text-svi-white mt-1 tabular-nums">{h.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI base + comparativa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiSimple
          label="Ingresos"
          value={fmtMoneda(d.totales.ingresos)}
          delta={d.comparativaAnterior.deltaPct.ingresos}
          accent="success"
        />
        <KpiSimple
          label="Egresos"
          value={fmtMoneda(d.totales.egresos)}
          delta={d.comparativaAnterior.deltaPct.egresos}
          accent="error"
          invertDelta
        />
        <KpiSimple
          label="Saldo"
          value={fmtMoneda(d.totales.saldo)}
          delta={d.comparativaAnterior.deltaPct.saldo}
          accent={d.totales.saldo >= 0 ? "gold" : "error"}
        />
        <KpiSimple label="Días operados" value={String(d.diasOperados)} accent="info" />
      </div>

      {/* Promedio diario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <PromedioDiarioCard label="Promedio ingresos / día" value={fmtMoneda(d.promedioDiario.ingresos)} accent="success" />
        <PromedioDiarioCard label="Promedio egresos / día" value={fmtMoneda(d.promedioDiario.egresos)} accent="error" />
        <PromedioDiarioCard
          label="Promedio saldo / día"
          value={fmtMoneda(d.promedioDiario.saldo)}
          accent={d.promedioDiario.saldo >= 0 ? "gold" : "error"}
        />
      </div>

      {/* Distribución por categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoriaListadoMensual
          title="Ingresos por categoría"
          rows={d.porCategoria.ingresos}
          accent="success"
        />
        <CategoriaListadoMensual
          title="Egresos por categoría"
          rows={d.porCategoria.egresos}
          accent="error"
        />
      </div>

      {/* Comparativa anterior */}
      <div className="bg-svi-card border border-svi-border-muted rounded-2xl p-4">
        <h4 className="text-sm font-semibold text-svi-muted uppercase tracking-wider mb-3">
          Período anterior (comparativa)
        </h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-svi-muted">Ingresos</p>
            <p className="text-svi-white font-mono tabular-nums">{fmtMoneda(d.comparativaAnterior.ingresos)}</p>
          </div>
          <div>
            <p className="text-[11px] text-svi-muted">Egresos</p>
            <p className="text-svi-white font-mono tabular-nums">{fmtMoneda(d.comparativaAnterior.egresos)}</p>
          </div>
          <div>
            <p className="text-[11px] text-svi-muted">Saldo</p>
            <p className={`font-mono tabular-nums ${
              d.comparativaAnterior.saldo >= 0 ? "text-svi-success" : "text-svi-error"
            }`}>
              {fmtMoneda(d.comparativaAnterior.saldo)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Export CSV ─────────────────────────────────────────────────────────

function CsvTab({ sucursalId }: { sucursalId: string }) {
  const today = todayArt();
  const [desde, setDesde] = useState(today.slice(0, 7) + "-01");
  const [hasta, setHasta] = useState(today);
  const [tipo, setTipo] = useState<"todos" | "ingreso" | "egreso">("todos");
  const [moneda, setMoneda] = useState<"todas" | "ARS" | "USD">("todas");
  const [pending, startTransition] = useTransition();

  function handleDescargar() {
    startTransition(async () => {
      const res = await exportarMovimientosCSV({
        sucursalId,
        desde,
        hasta,
        tipo,
        moneda,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      try {
        const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("CSV descargado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al descargar el archivo");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-svi-card border border-svi-border-muted rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-svi-white mb-1">Export CSV de movimientos</h2>
          <p className="text-xs text-svi-muted">
            Descargá un CSV (compatible con Excel) con todos los movimientos del rango filtrado.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-svi-muted uppercase tracking-wider">Rango</span>
            <DateRangePicker
              desde={desde}
              hasta={hasta}
              onChange={(next) => {
                setDesde(next.desde);
                setHasta(next.hasta);
              }}
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-svi-muted uppercase tracking-wider">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-svi-muted uppercase tracking-wider">Moneda</span>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as typeof moneda)}
              className="h-10 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
            >
              <option value="todas">Todas</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <button
            type="button"
            disabled={pending || !desde || !hasta}
            onClick={handleDescargar}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-svi-gold text-svi-black text-sm font-semibold hover:bg-svi-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generando CSV...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Descargar CSV
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-svi-muted-2">
          Columnas: fecha, hora, tipo, categoría, concepto, monto, moneda, registrado_por, comprobante_url. Hasta 100 000 filas por export.
        </p>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function KpiSimple({
  label, value, accent, delta, invertDelta,
}: {
  label: string;
  value: string;
  accent: "success" | "error" | "gold" | "info";
  delta?: number;
  invertDelta?: boolean;
}) {
  const accentClass = {
    success: "text-svi-success",
    error:   "text-svi-error",
    gold:    "text-svi-gold",
    info:    "text-svi-info",
  }[accent];

  let deltaNode: React.ReactNode = null;
  if (typeof delta === "number" && Number.isFinite(delta)) {
    const positive = delta > 0;
    const negative = delta < 0;
    const isFavorable = invertDelta ? negative : positive;
    const tone =
      delta === 0
        ? "text-svi-muted"
        : isFavorable
          ? "text-svi-success"
          : "text-svi-error";
    const sign = delta > 0 ? "+" : "";
    deltaNode = (
      <span className={`text-[11px] ${tone}`}>
        {sign}{delta.toFixed(1)}% vs anterior
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-svi-muted">{label}</p>
      <p className={`text-base font-semibold mt-1 tabular-nums ${accentClass}`}>{value}</p>
      {deltaNode && <div className="mt-1">{deltaNode}</div>}
    </div>
  );
}

function PromedioDiarioCard({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent: "success" | "error" | "gold";
}) {
  const accentClass = {
    success: "text-svi-success",
    error:   "text-svi-error",
    gold:    "text-svi-gold",
  }[accent];
  return (
    <div className="rounded-xl border border-svi-border-muted/60 bg-svi-elevated/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-svi-muted">{label}</p>
      <p className={`text-sm font-mono font-semibold mt-1 tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}

function TopCategoriaTable({
  title, rows, accent, icon,
}: {
  title: string;
  rows: Array<{ categoria: string; total: number; count: number; pct: number }>;
  accent: "success" | "error";
  icon: React.ReactNode;
}) {
  const accentClass = accent === "success" ? "text-svi-success" : "text-svi-error";

  return (
    <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
      <h4 className="text-sm font-semibold text-svi-white px-4 pt-3 pb-2 flex items-center gap-2">
        <span className={accentClass}>{icon}</span>
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-svi-muted">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-svi-border-muted text-svi-muted text-xs uppercase tracking-wide">
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">N°</th>
              <th className="px-4 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={`border-b border-svi-border-muted/50 last:border-0 ${
                  i % 2 === 0 ? "" : "bg-svi-elevated/30"
                }`}
              >
                <td className="px-4 py-2 text-svi-white">{r.categoria}</td>
                <td className={`px-4 py-2 text-right font-mono tabular-nums ${accentClass}`}>
                  {fmtMoneda(r.total)}
                </td>
                <td className="px-4 py-2 text-right text-svi-muted-2 tabular-nums">{r.count}</td>
                <td className="px-4 py-2 text-right text-svi-muted-2 tabular-nums">
                  {r.pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CategoriaListadoMensual({
  title, rows, accent,
}: {
  title: string;
  rows: Array<{ categoria: string; total: number; pct: number; color: string }>;
  accent: "success" | "error";
}) {
  const accentClass = accent === "success" ? "text-svi-success" : "text-svi-error";

  return (
    <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
      <h4 className="text-sm font-semibold text-svi-white px-4 pt-3 pb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-svi-muted">Sin datos.</p>
      ) : (
        <ul className="divide-y divide-svi-border-muted/50">
          {rows.map((r, i) => (
            <li key={i} className="px-4 py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span className="text-sm text-svi-white truncate">{r.categoria}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-svi-muted-2 tabular-nums">{r.pct.toFixed(1)}%</span>
                <span className={`text-sm font-mono tabular-nums ${accentClass}`}>
                  {fmtMoneda(r.total)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
