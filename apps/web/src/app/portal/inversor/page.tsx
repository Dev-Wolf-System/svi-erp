import { ArrowDownToLine, Banknote, Calendar, TrendingUp } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, KpiCard } from "@repo/ui";
import { formatCurrency, formatDate, formatPercent } from "@repo/utils";

interface Liquidacion {
  periodo: string;
  monto: number;
  estado: "pagada" | "pendiente";
  fechaPago?: Date;
}

const liquidaciones: Liquidacion[] = [
  { periodo: "Marzo 2026", monto: 250_000, estado: "pagada", fechaPago: new Date("2026-04-01") },
  { periodo: "Febrero 2026", monto: 250_000, estado: "pagada", fechaPago: new Date("2026-03-01") },
  { periodo: "Enero 2026", monto: 250_000, estado: "pagada", fechaPago: new Date("2026-02-01") },
  { periodo: "Diciembre 2025", monto: 250_000, estado: "pagada", fechaPago: new Date("2026-01-01") },
];

export default function PortalInversorPage() {
  const capital = 5_000_000;
  const tasa = 5;
  const proximoPago = new Date("2026-05-01");
  const acumulado = liquidaciones.reduce((acc, l) => acc + (l.estado === "pagada" ? l.monto : 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-10 py-12">
      <header className="mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
          Portal inversor · Demo
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-svi-white">
          Tu inversión
        </h1>
        <p className="mt-2 text-svi-muted-2">
          Capital, rendimientos y próximas liquidaciones — actualizado en tiempo real.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4 mb-10">
        <KpiCard
          title="Capital invertido"
          value={formatCurrency(capital)}
          hint="Contrato SVI-INV-2026-00007"
          icon={Banknote}
          palette="gold"
        />
        <KpiCard
          title="Tasa mensual"
          value={formatPercent(tasa)}
          hint="Vigente"
          icon={TrendingUp}
          palette="success"
        />
        <KpiCard
          title="Rendimiento acumulado"
          value={formatCurrency(acumulado)}
          hint={`${liquidaciones.filter((l) => l.estado === "pagada").length} liquidaciones cobradas`}
          icon={ArrowDownToLine}
          palette="success"
        />
        <KpiCard
          title="Próximo pago"
          value={formatDate(proximoPago)}
          hint={formatCurrency(capital * tasa / 100)}
          icon={Calendar}
          palette="gold"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Historial de liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted text-left">
                  <th className="px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2">
                    Período
                  </th>
                  <th className="px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2 text-right">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2">
                    Fecha pago
                  </th>
                  <th className="px-6 py-3 text-xs font-mono uppercase tracking-wider text-svi-muted-2">
                    Estado
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-svi-border-muted">
                {liquidaciones.map((l) => (
                  <tr key={l.periodo} className="hover:bg-svi-elevated/40 transition-colors">
                    <td className="px-6 py-3 text-svi-white">{l.periodo}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-svi-gold font-semibold">
                      {formatCurrency(l.monto)}
                    </td>
                    <td className="px-6 py-3 text-svi-muted-2">
                      {l.fechaPago ? formatDate(l.fechaPago) : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={l.estado === "pagada" ? "success" : "warning"}>
                        {l.estado === "pagada" ? "Pagada" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <a href="#" className="text-svi-gold hover:underline text-xs">
                        Comprobante →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
