import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Plus, ArrowUpCircle, ArrowDownCircle, ChevronLeft,
} from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getSucursalesAccesibles,
  getMovimientosFiltrados,
  getUsuariosRegistradores,
  artFecha,
} from "@/modules/caja/queries";
import {
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
  type TipoMovimiento,
  type Moneda,
} from "@/modules/caja/schemas";
import { AnularBtn } from "../anular-btn";
import { FiltrosMovimientos } from "./filtros-movimientos";
import { PaginacionRouter } from "./paginacion-router";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Movimientos · Caja · SVI",
};

const PAGE_SIZE = 25;

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

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function labelCategoria(tipo: "ingreso" | "egreso", cat: string): string {
  const lista = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  return (lista as readonly { value: string; label: string }[]).find((c) => c.value === cat)?.label ?? cat;
}

function primerDiaDelMes(fechaArt: string): string {
  return `${fechaArt.slice(0, 7)}-01`;
}

function nombreUsuario(id: string | null, usuarios: Array<{ id: string; nombre: string }>): string {
  if (!id) return "—";
  return usuarios.find((u) => u.id === id)?.nombre ?? "—";
}

interface PageProps {
  searchParams: Promise<{
    desde?:         string;
    hasta?:         string;
    tipo?:          string;
    categoria?:     string;
    moneda?:        string;
    concepto?:      string;
    registradoPor?: string;
    page?:          string;
  }>;
}

export default async function MovimientosPage({ searchParams }: PageProps) {
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

  const sucursal = sucursales[0]!;
  const sp = (await searchParams) ?? {};

  // Defaults: este mes a hoy
  const hoy = artFecha();
  const inicioMes = primerDiaDelMes(hoy);

  // Resolver y validar filtros
  const desde = sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : inicioMes;
  const hasta = sp.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta) ? sp.hasta : hoy;

  const tipoParam: TipoMovimiento | "todos" =
    sp.tipo === "ingreso" || sp.tipo === "egreso" ? (sp.tipo as TipoMovimiento) : "todos";

  // Categoría: solo válida si el tipo está fijo y la value es válida para ese tipo
  let categoriaParam: string | "todas" = "todas";
  if (sp.categoria && sp.categoria !== "todas" && tipoParam !== "todos") {
    const lista = tipoParam === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
    if ((lista as readonly { value: string }[]).some((c) => c.value === sp.categoria)) {
      categoriaParam = sp.categoria;
    }
  }

  const monedaParam: Moneda | "todas" =
    sp.moneda === "ARS" || sp.moneda === "USD" ? (sp.moneda as Moneda) : "todas";

  const conceptoParam = (sp.concepto ?? "").trim();
  const registradoPorParam = (sp.registradoPor ?? "").trim();

  const pageRaw = parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const [pagina, usuarios] = await Promise.all([
    getMovimientosFiltrados({
      sucursalId:    sucursal.id,
      desde,
      hasta,
      tipo:          tipoParam,
      categoria:     categoriaParam,
      moneda:        monedaParam,
      concepto:      conceptoParam || undefined,
      registradoPor: registradoPorParam || undefined,
      page,
      pageSize:      PAGE_SIZE,
    }),
    getUsuariosRegistradores(sucursal.id),
  ]);

  const puedeRegistrar = can("caja.registrar", claims.rol);

  return (
    <div className="space-y-4">
      {/* Header con breadcrumb + acción */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-svi-muted">
            <Link href="/caja" className="inline-flex items-center gap-1 hover:text-svi-gold transition">
              <ChevronLeft className="size-3" />
              Caja
            </Link>{" "}
            <span className="text-svi-muted-2">/</span> Movimientos
          </p>
          <h1 className="text-2xl font-bold text-svi-white flex items-center gap-2">
            <Wallet className="size-6 text-svi-gold" />
            Movimientos de caja
          </h1>
          <p className="text-sm text-svi-muted">
            {sucursal.nombre} · <span className="tabular-nums">{pagina.total}</span>{" "}
            {pagina.total === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        {puedeRegistrar && (
          <Link
            href="/caja/movimientos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-svi-gold text-svi-black text-sm font-semibold hover:bg-svi-gold/90 transition shrink-0"
          >
            <Plus className="size-4" />
            Registrar movimiento
          </Link>
        )}
      </div>

      {/* Barra de filtros */}
      <FiltrosMovimientos
        initial={{
          desde,
          hasta,
          tipo:          tipoParam,
          categoria:     categoriaParam,
          moneda:        monedaParam,
          concepto:      conceptoParam,
          registradoPor: registradoPorParam,
        }}
        usuarios={usuarios}
      />

      {/* Tabla */}
      {pagina.movimientos.length === 0 ? (
        <div className="text-center py-16 text-svi-muted-2 border border-dashed border-svi-border-muted rounded-2xl">
          <Wallet className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin resultados con los filtros aplicados.</p>
          <p className="text-xs mt-1">Probá ampliar el rango de fechas o limpiar filtros.</p>
        </div>
      ) : (
        <div className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted text-svi-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Hora</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Categoría</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap hidden md:table-cell">
                    Registrado por
                  </th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Monto</th>
                  {puedeRegistrar && <th className="px-4 py-3 w-12" />}
                </tr>
              </thead>
              <tbody>
                {pagina.movimientos.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-svi-border-muted/50 last:border-0 ${
                      i % 2 === 0 ? "" : "bg-svi-elevated/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-svi-muted-2 tabular-nums whitespace-nowrap">
                      {fmtFecha(m.fecha_operacion)}
                    </td>
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
                    <td className="px-4 py-3 text-svi-muted-2 whitespace-nowrap">
                      {labelCategoria(m.tipo, m.categoria)}
                    </td>
                    <td className="px-4 py-3 text-svi-white max-w-[280px] truncate">
                      {m.concepto}
                    </td>
                    <td className="px-4 py-3 text-svi-muted-2 hidden md:table-cell whitespace-nowrap">
                      {nombreUsuario(m.registrado_por, usuarios)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        m.tipo === "ingreso" ? "text-svi-success" : "text-svi-error"
                      }`}
                    >
                      {m.moneda !== "ARS" && (
                        <span className="text-xs font-normal text-svi-muted mr-1">{m.moneda}</span>
                      )}
                      {m.tipo === "ingreso" ? "+" : "-"}
                      {fmt(Number(m.monto))}
                    </td>
                    {puedeRegistrar && (
                      <td className="px-2 py-3">
                        {!m.cierre_id && <AnularBtn id={m.id} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginacionRouter
        page={pagina.page}
        totalPages={pagina.totalPages}
        pageSize={pagina.pageSize}
        total={pagina.total}
      />
    </div>
  );
}
