import {
  Car,
  ShoppingCart,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  GlassPanel,
  KpiCard,
} from "@repo/ui";
import { formatCurrency, formatCurrencyCompact } from "@repo/utils";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Resumen general
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Buen día, equipo SVI
          </h1>
          <p className="mt-2 text-svi-muted-2 text-sm">
            Datos consolidados de las 3 sucursales — actualizados en tiempo real.
          </p>
        </div>
        <Badge variant="gold">DEMO · datos placeholder</Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del mes"
          value={formatCurrencyCompact(187_500_000)}
          change={12.4}
          trend="up"
          hint="vs mes anterior"
          icon={ShoppingCart}
          palette="success"
        />
        <KpiCard
          title="Stock disponible"
          value="84"
          change={-3}
          trend="down"
          hint="unidades en salón"
          icon={Car}
          palette="gold"
        />
        <KpiCard
          title="Capital invertido FCI"
          value={formatCurrencyCompact(245_000_000)}
          change={8.2}
          trend="up"
          hint="42 inversores activos"
          icon={TrendingUp}
          palette="default"
        />
        <KpiCard
          title="Caja del día"
          value={formatCurrencyCompact(4_350_000)}
          hint="3 sucursales"
          icon={Wallet}
          palette="success"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendencia de ventas — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center text-svi-muted-2 text-sm border border-dashed border-svi-border-muted rounded-lg">
              <p>Gráfica Recharts (Fase 8 — IA y Analítica)</p>
            </div>
          </CardContent>
        </Card>

        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-svi-gold" />
            <h3 className="font-display text-lg font-semibold text-svi-white">
              Insights IA
            </h3>
          </div>
          <p className="text-xs text-svi-muted-2 mb-4">
            Análisis automático de Claude — disponible en Fase 8.
          </p>
          <ul className="space-y-3 text-sm">
            <InsightItem
              text="Las ventas de 0KM crecieron 18% mes contra mes."
              accent="success"
            />
            <InsightItem
              text="3 vehículos con stock crítico (Toyota Corolla)."
              accent="warning"
            />
            <InsightItem
              text="Liquidación FCI de mayo en preparación."
              accent="info"
            />
          </ul>
        </GlassPanel>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operaciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted">
                  <Th>Operación</Th>
                  <Th>Cliente</Th>
                  <Th>Vehículo</Th>
                  <Th align="right">Monto</Th>
                  <Th>Sucursal</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-svi-border-muted">
                <Row n="SVI-AGU-2026-00031" cliente="Matías D." vehiculo="Toyota Hilux SRX" monto={42_000_000} sucursal="Aguilares" estado="aprobado" />
                <Row n="SVI-CON-2026-00018" cliente="Lucía R." vehiculo="VW Amarok V6" monto={58_900_000} sucursal="Concepción" estado="reserva" />
                <Row n="SVI-TUC-2026-00009" cliente="Pedro S." vehiculo="Honda CB 500F" monto={9_800_000} sucursal="S.M. de Tucumán" estado="entregado" />
                <Row n="SVI-AGU-2026-00030" cliente="Andrea M." vehiculo="Toyota Corolla XEi" monto={28_500_000} sucursal="Aguilares" estado="finalizado" />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Row({
  n,
  cliente,
  vehiculo,
  monto,
  sucursal,
  estado,
}: {
  n: string;
  cliente: string;
  vehiculo: string;
  monto: number;
  sucursal: string;
  estado: string;
}) {
  const variant =
    estado === "aprobado"
      ? "info"
      : estado === "entregado"
        ? "success"
        : estado === "finalizado"
          ? "default"
          : "warning";
  return (
    <tr className="hover:bg-svi-elevated/40 transition-colors">
      <td className="px-6 py-3 font-mono text-xs text-svi-gold">{n}</td>
      <td className="px-6 py-3 text-svi-white">{cliente}</td>
      <td className="px-6 py-3 text-svi-muted">{vehiculo}</td>
      <td className="px-6 py-3 text-right tabular-nums text-svi-white">
        {formatCurrency(monto)}
      </td>
      <td className="px-6 py-3 text-svi-muted-2 text-xs">{sucursal}</td>
      <td className="px-6 py-3">
        <Badge variant={variant as never}>{estado}</Badge>
      </td>
    </tr>
  );
}

function InsightItem({
  text,
  accent,
}: {
  text: string;
  accent: "success" | "warning" | "info";
}) {
  const colors = {
    success: "text-svi-success",
    warning: "text-svi-warning",
    info: "text-svi-info",
  } as const;
  return (
    <li className="flex items-start gap-2">
      <ArrowUpRight className={`h-4 w-4 shrink-0 mt-0.5 ${colors[accent]}`} />
      <span className="text-svi-muted">{text}</span>
    </li>
  );
}
