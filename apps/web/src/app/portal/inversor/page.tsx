import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownToLine,
  Banknote,
  Calendar,
  TrendingUp,
  ChevronRight,
  Receipt,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
} from "@repo/ui";
import { formatCurrency, formatDate, formatPercent } from "@repo/utils";
import { getInversorSession } from "@/lib/auth/inversor";
import {
  getInversionesDelInversor,
  getLiquidacionesDelInversor,
  type LiquidacionPortalRow,
} from "@/lib/portal/queries";

export const metadata = { title: "Portal · Inversor — SVI" };

export default async function PortalInversorPage() {
  const session = await getInversorSession();
  if (!session) redirect("/portal/login?tipo=inversor");

  const [inversiones, liquidacionesRecientes] = await Promise.all([
    getInversionesDelInversor(session),
    getLiquidacionesDelInversor(session, { limit: 12 }),
  ]);

  const activas = inversiones.filter((i) => i.estado === "activa");
  const capitalARS = activas
    .filter((i) => i.moneda === "ARS")
    .reduce((acc, i) => acc + Number(i.capital_actual), 0);
  const capitalUSD = activas
    .filter((i) => i.moneda === "USD")
    .reduce((acc, i) => acc + Number(i.capital_actual), 0);

  const pagadas = liquidacionesRecientes.filter((l) => l.estado === "pagada");
  const pendientes = liquidacionesRecientes.filter(
    (l) => l.estado === "pendiente",
  );
  const acumARS = pagadas
    .filter((l) => l.moneda === "ARS")
    .reduce((acc, l) => acc + Number(l.monto_interes), 0);
  const acumUSD = pagadas
    .filter((l) => l.moneda === "USD")
    .reduce((acc, l) => acc + Number(l.monto_interes), 0);

  const proximoMonto = pendientes
    .filter((l) => l.moneda === "ARS")
    .reduce((acc, l) => acc + Number(l.monto_interes), 0);

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-10 py-12">
      <header className="mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
          Portal · {session.nombre}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-svi-white">
          Tus inversiones
        </h1>
        <p className="mt-2 text-svi-muted-2">
          Capital, rendimientos y próximas liquidaciones — actualizado en tiempo real.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4 mb-10">
        <KpiCard
          title="Capital ARS"
          value={formatCurrency(capitalARS, "ARS")}
          hint={`${activas.filter((i) => i.moneda === "ARS").length} contratos activos`}
          icon={Banknote}
          palette="gold"
        />
        <KpiCard
          title="Capital USD"
          value={capitalUSD > 0 ? formatCurrency(capitalUSD, "USD") : "—"}
          hint={
            capitalUSD > 0
              ? `${activas.filter((i) => i.moneda === "USD").length} contratos`
              : "Sin contratos en USD"
          }
          icon={TrendingUp}
          palette="success"
        />
        <KpiCard
          title="Rendimiento cobrado"
          value={formatCurrency(acumARS, "ARS")}
          hint={`${pagadas.length} liquidaciones${acumUSD > 0 ? ` + ${formatCurrency(acumUSD, "USD")}` : ""}`}
          icon={ArrowDownToLine}
          palette="success"
        />
        <KpiCard
          title="Por cobrar"
          value={formatCurrency(proximoMonto, "ARS")}
          hint={`${pendientes.length} liquidaciones pendientes`}
          icon={Calendar}
          palette="gold"
        />
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Mis inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          {inversiones.length === 0 ? (
            <p className="text-sm text-svi-muted-2 py-4">
              Aún no tenés inversiones registradas. Si esperás aparecer acá,
              avisanos a soporte@svi.com.ar.
            </p>
          ) : (
            <ul className="divide-y divide-svi-border-muted">
              {inversiones.map((i) => {
                const moneda = i.moneda as "ARS" | "USD";
                return (
                  <li key={i.id}>
                    <Link
                      href={`/portal/inversor/inversiones/${i.id}`}
                      className="flex items-center justify-between gap-4 py-3 hover:bg-svi-elevated/30 -mx-3 px-3 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-sm font-mono text-svi-gold">
                          {i.numero_contrato}
                        </p>
                        <p className="text-xs text-svi-muted-2">
                          Desde {formatDate(i.fecha_inicio)}
                          {i.fecha_vencimiento &&
                            ` · vence ${formatDate(i.fecha_vencimiento)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-svi-white">
                          {formatCurrency(Number(i.capital_actual), moneda)}
                        </p>
                        <p className="text-xs text-svi-muted-2">
                          {formatPercent(Number(i.tasa_mensual), 2)} mensual
                        </p>
                      </div>
                      <Badge
                        variant={i.estado === "activa" ? "success" : "warning"}
                      >
                        {i.estado}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-svi-muted-2" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {liquidacionesRecientes.length === 0 ? (
            <p className="text-sm text-svi-muted-2 py-4">
              Sin liquidaciones registradas todavía.
            </p>
          ) : (
            <LiquidacionesPreviewTable items={liquidacionesRecientes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LiquidacionesPreviewTable({
  items,
}: {
  items: LiquidacionPortalRow[];
}) {
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-svi-border-muted text-left">
            <Th>Período</Th>
            <Th>Contrato</Th>
            <Th className="text-right">Monto</Th>
            <Th>Estado</Th>
            <Th>Decisión</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-svi-border-muted">
          {items.map((l) => {
            const moneda = l.moneda as "ARS" | "USD";
            return (
              <tr
                key={l.id}
                className="hover:bg-svi-elevated/40 transition-colors"
              >
                <td className="px-6 py-3 font-mono text-xs text-svi-white">
                  {formatPeriodo(l.periodo)}
                </td>
                <td className="px-6 py-3 font-mono text-[11px] text-svi-muted">
                  {l.numero_contrato}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-svi-gold font-semibold">
                  {formatCurrency(Number(l.monto_interes), moneda)}
                </td>
                <td className="px-6 py-3">
                  <Badge
                    variant={
                      l.estado === "pagada"
                        ? "success"
                        : l.estado === "pendiente"
                          ? "warning"
                          : "default"
                    }
                  >
                    {l.estado}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-xs">
                  {l.estado === "pagada" ? (
                    <span className="text-svi-muted">
                      {l.modo_pago_inversor === "reinvertir"
                        ? "↻ Reinvertido"
                        : "↗ Retirado"}
                    </span>
                  ) : l.modo_solicitado_inversor ? (
                    <span className="text-svi-gold">
                      {l.modo_solicitado_inversor === "reinvertir"
                        ? "↻ Reinvertir"
                        : "↗ Retirar"}{" "}
                      (solicitado)
                    </span>
                  ) : (
                    <span className="text-svi-muted-2 italic">sin elegir</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/portal/inversor/inversiones/${l.inversion_id}`}
                    className="text-svi-gold hover:underline text-xs inline-flex items-center gap-1"
                  >
                    {l.recibo_url && <Receipt className="h-3 w-3" />}
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
      className={`px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function formatPeriodo(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${meses[Number(m[2]) - 1]} ${m[1]}`;
}
