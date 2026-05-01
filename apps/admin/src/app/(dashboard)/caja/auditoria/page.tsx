import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Plus, Pencil, Trash2, Sparkles, User } from "lucide-react";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { artFecha } from "@/modules/caja/queries";
import { getAuditLog } from "@/modules/auditoria/queries";
import type { AuditEventRow } from "@/modules/auditoria/schemas";
import { FiltrosAuditoria } from "./filtros-auditoria";
import { PaginacionRouter } from "./paginacion-router";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Auditoría · Caja · SVI",
};

type Operacion = "TODAS" | "INSERT" | "UPDATE" | "DELETE" | "EVENT";

const OPERACIONES_VALIDAS: ReadonlySet<Operacion> = new Set([
  "TODAS", "INSERT", "UPDATE", "DELETE", "EVENT",
]);

function primerDiaDelMes(fechaArt: string): string {
  return `${fechaArt.slice(0, 7)}-01`;
}

function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function truncarId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

const OPERACION_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof Plus }> = {
  INSERT: { bg: "bg-svi-success/15", text: "text-svi-success", label: "Inserción",     icon: Plus },
  UPDATE: { bg: "bg-svi-warning/15", text: "text-svi-warning", label: "Modificación",  icon: Pencil },
  DELETE: { bg: "bg-svi-error/15",   text: "text-svi-error",   label: "Eliminación",   icon: Trash2 },
  EVENT:  { bg: "bg-svi-info/15",    text: "text-svi-info",    label: "Evento",         icon: Sparkles },
};

const TABLA_LABELS: Record<string, string> = {
  movimientos_caja: "Movimiento de caja",
  cierres_caja:     "Cierre de caja",
};

interface DiffEntry {
  key: string;
  before: unknown;
  after:  unknown;
}

function calcularDiff(before: unknown, after: unknown): DiffEntry[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after  as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const out: DiffEntry[] = [];
  for (const k of keys) {
    const vb = JSON.stringify(b[k] ?? null);
    const va = JSON.stringify(a[k] ?? null);
    if (vb !== va) out.push({ key: k, before: b[k] ?? null, after: a[k] ?? null });
  }
  return out;
}

interface SearchParams {
  desde?:     string;
  hasta?:     string;
  operacion?: string;
  action?:    string;
  page?:      string;
}

export default async function AuditoriaCajaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("caja.view_global", claims.rol)) redirect("/caja");

  const sp = await searchParams;
  const hoy = artFecha();

  const desde = sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : primerDiaDelMes(hoy);
  const hasta = sp.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta) ? sp.hasta : hoy;
  const operacion: Operacion = OPERACIONES_VALIDAS.has((sp.operacion ?? "TODAS") as Operacion)
    ? (sp.operacion as Operacion)
    : "TODAS";
  const action = sp.action?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;

  const { eventos, total, totalPages } = await getAuditLog({
    desde,
    hasta,
    tablas:    ["movimientos_caja", "cierres_caja"],
    operacion,
    action,
    page,
    pageSize,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/caja"
            className="inline-flex items-center gap-1 text-xs text-svi-muted hover:text-svi-white transition mb-2"
          >
            <ArrowLeft className="size-3" />
            Caja
          </Link>
          <h1 className="text-2xl font-bold text-svi-white flex items-center gap-2">
            <Shield className="size-6 text-svi-gold" />
            Auditoría
          </h1>
          <p className="text-sm text-svi-muted mt-1">
            Registro inmutable de operaciones · {total.toLocaleString("es-AR")} eventos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosAuditoria
        initial={{ desde, hasta, operacion, action: action ?? "" }}
      />

      {/* Timeline */}
      {eventos.length === 0 ? (
        <div className="text-center py-12 text-svi-muted-2 border border-dashed border-svi-border-muted rounded-2xl">
          <Shield className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin eventos en el rango seleccionado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {eventos.map((e) => (
            <EventRow key={e.id} ev={e} />
          ))}
        </ul>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <PaginacionRouter
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
        />
      )}
    </div>
  );
}

// ─── Row de evento ───────────────────────────────────────────────────────────

function EventRow({ ev }: { ev: AuditEventRow }) {
  const op = OPERACION_STYLES[ev.operacion] ?? OPERACION_STYLES.EVENT!;
  const Icon = op.icon;
  const semantic = (ev.metadata as { action?: string } | null)?.action;
  const tablaLabel = TABLA_LABELS[ev.tabla] ?? ev.tabla;
  const diff = ev.operacion === "UPDATE" ? calcularDiff(ev.datos_anteriores, ev.datos_nuevos) : [];

  return (
    <li className="bg-svi-card border border-svi-border-muted rounded-2xl overflow-hidden">
      <details>
        <summary className="cursor-pointer list-none p-4 flex items-start gap-3 hover:bg-svi-elevated/40 transition">
          <span
            className={`inline-flex items-center justify-center size-8 rounded-lg shrink-0 ${op.bg} ${op.text}`}
          >
            <Icon className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-svi-white font-medium">{tablaLabel}</span>
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${op.bg} ${op.text}`}
              >
                {op.label}
              </span>
              {semantic && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-svi-gold/15 text-svi-gold">
                  {semantic}
                </span>
              )}
              {ev.registro_id && (
                <code className="text-[11px] text-svi-muted font-mono">{truncarId(ev.registro_id)}</code>
              )}
            </div>
            <p className="text-xs text-svi-muted mt-1 flex items-center gap-1.5">
              <User className="size-3" />
              {ev.usuario_nombre ?? "Sistema"}
              <span className="opacity-50">·</span>
              <time>{fmtFechaHora(ev.created_at)}</time>
              {ev.ip_address && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="font-mono">{ev.ip_address}</span>
                </>
              )}
            </p>
          </div>
        </summary>

        <div className="border-t border-svi-border-muted bg-svi-dark/40 px-4 py-3 space-y-3">
          {ev.metadata && Object.keys(ev.metadata).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">Metadata</p>
              <pre className="text-[11px] text-svi-white/80 bg-svi-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(ev.metadata, null, 2)}
              </pre>
            </div>
          )}

          {diff.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">
                Cambios ({diff.length})
              </p>
              <table className="text-[11px] w-full">
                <thead>
                  <tr className="text-svi-muted-2 text-left">
                    <th className="font-medium pr-3 pb-1">Campo</th>
                    <th className="font-medium pr-3 pb-1">Antes</th>
                    <th className="font-medium pb-1">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((d) => (
                    <tr key={d.key} className="border-t border-svi-border-muted/30">
                      <td className="font-mono text-svi-gold py-1 pr-3 align-top">{d.key}</td>
                      <td className="font-mono text-svi-error/80 py-1 pr-3 align-top break-all">
                        {JSON.stringify(d.before)}
                      </td>
                      <td className="font-mono text-svi-success/80 py-1 align-top break-all">
                        {JSON.stringify(d.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ev.operacion === "INSERT" && ev.datos_nuevos != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">Datos creados</p>
              <pre className="text-[11px] text-svi-white/80 bg-svi-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(ev.datos_nuevos, null, 2)}
              </pre>
            </div>
          )}

          {ev.operacion === "DELETE" && ev.datos_anteriores != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">Datos eliminados</p>
              <pre className="text-[11px] text-svi-white/80 bg-svi-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(ev.datos_anteriores, null, 2)}
              </pre>
            </div>
          )}

          {ev.operacion === "EVENT" && (ev.datos_anteriores != null || ev.datos_nuevos != null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ev.datos_anteriores != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">Antes</p>
                  <pre className="text-[11px] text-svi-white/80 bg-svi-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(ev.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}
              {ev.datos_nuevos != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-svi-muted mb-1">Después</p>
                  <pre className="text-[11px] text-svi-white/80 bg-svi-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(ev.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
