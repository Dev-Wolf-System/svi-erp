import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  FileSignature,
  Receipt,
  ExternalLink,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCurrency, formatDate, formatPercent } from "@repo/utils";
import { getInversorSession } from "@/lib/auth/inversor";
import {
  getInversionesDelInversor,
  getLiquidacionesDelInversor,
  getSolicitudesDelInversor,
  type LiquidacionPortalRow,
  type SolicitudAportePortalRow,
} from "@/lib/portal/queries";
import { DecidirModoButton } from "./decidir-modo-button";
import { SolicitarAporteForm } from "./solicitar-aporte-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Detalle de inversión — SVI" };

export default async function InversionPortalDetallePage({
  params,
}: PageProps) {
  const session = await getInversorSession();
  if (!session) redirect("/portal/login?tipo=inversor");

  const { id } = await params;
  const [inversiones, liquidaciones, solicitudes] = await Promise.all([
    getInversionesDelInversor(session),
    getLiquidacionesDelInversor(session, { inversion_id: id }),
    getSolicitudesDelInversor(session),
  ]);

  const inv = inversiones.find((i) => i.id === id);
  if (!inv) notFound();

  const moneda = inv.moneda as "ARS" | "USD";
  const solicitudesDeEstaInv = solicitudes.filter(
    (s) => s.inversion_id === inv.id,
  );
  const pendientes = liquidaciones.filter((l) => l.estado === "pendiente");
  const pagadas = liquidaciones.filter((l) => l.estado === "pagada");

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10 py-12 space-y-8">
      <header className="flex items-start gap-4">
        <Link
          href="/portal/inversor"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Contrato
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-svi-white">
            {inv.numero_contrato}
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            Desde {formatDate(inv.fecha_inicio)}
            {inv.fecha_vencimiento &&
              ` · vence ${formatDate(inv.fecha_vencimiento)}`}
          </p>
        </div>
        <Badge
          variant={inv.estado === "activa" ? "success" : "warning"}
          className="ml-auto"
        >
          {inv.estado}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Spec
              label="Capital actual"
              value={formatCurrency(Number(inv.capital_actual), moneda)}
              mono
              highlight
            />
            <Spec
              label="Capital inicial"
              value={formatCurrency(Number(inv.capital_inicial), moneda)}
              mono
            />
            <Spec
              label="Tasa mensual"
              value={formatPercent(Number(inv.tasa_mensual), 2)}
              mono
            />
          </dl>
          {inv.contrato_url && (
            <p className="mt-4 pt-4 border-t border-svi-border-muted/50 text-xs text-svi-muted-2">
              <FileSignature className="h-3.5 w-3.5 inline mr-1.5 text-svi-gold" />
              Tu contrato está firmado y archivado. Pedile una copia a soporte
              si la necesitás.
            </p>
          )}
        </CardContent>
      </Card>

      {inv.estado === "activa" && (
        <Card>
          <CardHeader>
            <CardTitle>Aporte adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <SolicitarAporteForm inversionId={inv.id} moneda={moneda} />
            {solicitudesDeEstaInv.length > 0 && (
              <div className="mt-4 pt-4 border-t border-svi-border-muted/50">
                <p className="text-xs uppercase tracking-wider text-svi-muted-2 mb-2">
                  Solicitudes
                </p>
                <SolicitudesList items={solicitudesDeEstaInv} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liquidaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-svi-muted-2 mb-4">
              Indicá tu preferencia para cada mes. El equipo administra el pago
              y respeta tu elección.
            </p>
            <LiquidacionesPendientesTable items={pendientes} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Liquidaciones cobradas
            <span className="ml-2 text-xs text-svi-muted-2 font-normal">
              ({pagadas.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagadas.length === 0 ? (
            <p className="text-sm text-svi-muted-2 py-4">
              Aún no hay liquidaciones cobradas.
            </p>
          ) : (
            <LiquidacionesPagadasTable items={pagadas} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LiquidacionesPendientesTable({
  items,
}: {
  items: LiquidacionPortalRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-svi-border-muted text-left">
            <Th>Período</Th>
            <Th className="text-right">Monto</Th>
            <Th>Tu decisión</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-svi-border-muted">
          {items.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3 font-mono text-xs">
                {formatPeriodoLargo(l.periodo)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-svi-gold font-semibold">
                {formatCurrency(
                  Number(l.monto_interes),
                  l.moneda as "ARS" | "USD",
                )}
              </td>
              <td className="px-4 py-3">
                <DecidirModoButton
                  liquidacionId={l.id}
                  modoActual={l.modo_solicitado_inversor}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiquidacionesPagadasTable({
  items,
}: {
  items: LiquidacionPortalRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-svi-border-muted text-left">
            <Th>Período</Th>
            <Th className="text-right">Monto</Th>
            <Th>Modo</Th>
            <Th>Pago</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-svi-border-muted">
          {items.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3 font-mono text-xs text-svi-white">
                {formatPeriodoLargo(l.periodo)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-svi-gold font-semibold">
                {formatCurrency(
                  Number(l.monto_interes),
                  l.moneda as "ARS" | "USD",
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                {l.modo_pago_inversor === "reinvertir" ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-svi-success/15 text-svi-success">
                    <TrendingUp className="h-3 w-3" />
                    Reinvertido
                  </span>
                ) : (
                  <span className="text-svi-muted">↗ Retirado</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-svi-muted-2">
                {l.fecha_pago ? formatDate(l.fecha_pago) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {l.recibo_url ? (
                  <Link
                    href={`/vr/${l.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-svi-gold hover:underline text-xs"
                  >
                    <Receipt className="h-3 w-3" />
                    Recibo
                  </Link>
                ) : (
                  <span className="text-svi-muted-2 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SolicitudesList({ items }: { items: SolicitudAportePortalRow[] }) {
  return (
    <ul className="divide-y divide-svi-border-muted/50">
      {items.map((s) => (
        <li key={s.id} className="py-2 flex items-start justify-between gap-3 text-sm">
          <div>
            <p className="font-mono text-svi-white">
              {formatCurrency(
                Number(s.monto_estimado),
                s.moneda as "ARS" | "USD",
              )}
              <span className="ml-2 text-xs text-svi-muted-2">
                ({formatDate(s.fecha_estimada)})
              </span>
            </p>
            {s.motivo && (
              <p className="text-xs text-svi-muted truncate max-w-md">
                {s.motivo}
              </p>
            )}
            {s.estado === "rechazada" && s.motivo_rechazo && (
              <p className="text-xs text-svi-error mt-1">
                Rechazada: {s.motivo_rechazo}
              </p>
            )}
          </div>
          <Badge
            variant={
              s.estado === "confirmada"
                ? "success"
                : s.estado === "rechazada"
                  ? "default"
                  : s.estado === "expirada"
                    ? "default"
                    : "warning"
            }
          >
            {s.estado}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function Spec({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-svi-muted-2">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${highlight ? "text-svi-gold text-lg font-bold" : "text-svi-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function formatPeriodoLargo(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${meses[Number(m[2]) - 1]} ${m[1]}`;
}
