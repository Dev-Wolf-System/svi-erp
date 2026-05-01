import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Plus,
  ArrowUpCircle, ArrowDownCircle, Lock, Calendar,
} from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getSucursalesAccesibles,
  getResumenDia,
  getMovimientosDia,
  getCierresRecientes,
  artFecha,
} from "@/modules/caja/queries";
import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO } from "@/modules/caja/schemas";
import { CierrePanel } from "./cierre-panel";
import { AnularBtn } from "./anular-btn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caja · SVI",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function labelCategoria(tipo: "ingreso" | "egreso", cat: string): string {
  const lista = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  return (lista as readonly { value: string; label: string }[]).find((c) => c.value === cat)?.label ?? cat;
}

export default async function CajaPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("caja.view_propia", claims.rol)) redirect("/dashboard");

  const sucursales = await getSucursalesAccesibles();
  if (sucursales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-svi-muted">
        <Wallet className="size-10 mb-3 opacity-30" />
        <p className="text-sm">No hay sucursales disponibles.</p>
      </div>
    );
  }

  // Single-sucursal: usa la primera. Multi-sucursal: TODO selector.
  const sucursal = sucursales[0]!;
  const hoy = artFecha();

  const [resumen, movimientos, cierresRecientes] = await Promise.all([
    getResumenDia(sucursal.id, hoy),
    getMovimientosDia(sucursal.id, hoy),
    getCierresRecientes(sucursal.id, 7),
  ]);

  const puedeRegistrar = can("caja.registrar", claims.rol);
  const puedeCerrar    = can("caja.cerrar", claims.rol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-svi-white flex items-center gap-2">
            <Wallet className="size-6 text-svi-gold" />
            Caja
          </h1>
          <p className="text-sm text-svi-muted mt-1">
            {sucursal.nombre} · <span className="font-mono">{hoy}</span>
            {resumen.cerrado && (
              <span className="ml-2 inline-flex items-center gap-1 text-svi-warning text-xs">
                <Lock className="size-3" /> Cerrada
              </span>
            )}
          </p>
        </div>
        {puedeRegistrar && !resumen.cerrado && (
          <Link
            href="/caja/movimientos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-svi-gold text-svi-black text-sm font-semibold hover:bg-svi-gold/90 transition shrink-0"
          >
            <Plus className="size-4" />
            Registrar movimiento
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos del día"
          value={fmt(resumen.total_ingresos)}
          icon={<TrendingUp className="size-5 text-svi-success" />}
          accent="success"
        />
        <KpiCard
          label="Egresos del día"
          value={fmt(resumen.total_egresos)}
          icon={<TrendingDown className="size-5 text-svi-error" />}
          accent="error"
        />
        <KpiCard
          label="Saldo neto"
          value={fmt(resumen.saldo)}
          icon={<DollarSign className="size-5 text-svi-gold" />}
          accent={resumen.saldo >= 0 ? "gold" : "error"}
        />
        <KpiCard
          label="Movimientos"
          value={String(resumen.count)}
          icon={<Wallet className="size-5 text-svi-info" />}
          accent="info"
        />
      </div>

      {/* Cierre panel / badge */}
      {!resumen.cerrado && puedeCerrar && (
        <CierrePanel sucursalId={sucursal.id} fecha={hoy} />
      )}
      {resumen.cerrado && resumen.cierre && (
        <div className="flex items-center gap-2 px-4 py-3 bg-svi-warning/10 border border-svi-warning/30 rounded-xl text-sm text-svi-warning">
          <Lock className="size-4 shrink-0" />
          <span>
            Caja cerrada a las{" "}
            <strong>{fmtHora(resumen.cierre.created_at)}</strong>
            {resumen.cierre.observaciones && (
              <span className="text-svi-muted ml-2">— {resumen.cierre.observaciones}</span>
            )}
          </span>
        </div>
      )}

      {/* Movimientos del día */}
      <section>
        <h2 className="text-sm font-semibold text-svi-muted uppercase tracking-wider mb-3">
          Movimientos de hoy
        </h2>

        {movimientos.length === 0 ? (
          <div className="text-center py-12 text-svi-muted-2 border border-dashed border-svi-border-muted rounded-2xl">
            <Wallet className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin movimientos registrados hoy.</p>
          </div>
        ) : (
          <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted text-svi-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  {puedeRegistrar && !resumen.cerrado && (
                    <th className="px-4 py-3 w-12" />
                  )}
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
                    <td className="px-4 py-3 text-svi-muted-2">
                      {labelCategoria(m.tipo, m.categoria)}
                    </td>
                    <td className="px-4 py-3 text-svi-white hidden md:table-cell max-w-[200px] truncate">
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
                      {fmt(Number(m.monto))}
                    </td>
                    {puedeRegistrar && !resumen.cerrado && (
                      <td className="px-2 py-3">
                        {!m.cierre_id && <AnularBtn id={m.id} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historial de cierres recientes */}
      {cierresRecientes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-svi-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="size-4" />
            Cierres recientes
          </h2>
          <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted text-svi-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">Egresos</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {cierresRecientes.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-svi-border-muted/50 last:border-0 ${
                      i % 2 === 0 ? "" : "bg-svi-elevated/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-svi-white font-medium">{c.fecha}</td>
                    <td className="px-4 py-3 text-right text-svi-success font-mono tabular-nums">
                      {fmt(Number(c.total_ingresos))}
                    </td>
                    <td className="px-4 py-3 text-right text-svi-error font-mono tabular-nums">
                      {fmt(Number(c.total_egresos))}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        Number(c.saldo) >= 0 ? "text-svi-success" : "text-svi-error"
                      }`}
                    >
                      {fmt(Number(c.saldo))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "success" | "error" | "gold" | "info";
}) {
  const ring = {
    success: "border-svi-success/20",
    error:   "border-svi-error/20",
    gold:    "border-svi-gold/20",
    info:    "border-svi-info/20",
  }[accent];

  return (
    <div className={`bg-svi-card border ${ring} rounded-2xl p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-svi-muted">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-svi-white font-mono tabular-nums leading-tight">
        {value}
      </p>
    </div>
  );
}
