import { Car, FileCheck, FileText, Wallet } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, KpiCard } from "@repo/ui";
import { formatCurrency, formatDate } from "@repo/utils";

export default function PortalClientePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-10 py-12">
      <header className="mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
          Portal cliente · Demo
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-svi-white">
          Hola, Matías
        </h1>
        <p className="mt-2 text-svi-muted-2">
          Acá vas a ver el estado de tu compra y la documentación asociada.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 mb-10">
        <KpiCard
          title="Vehículo en trámite"
          value="Toyota Hilux SRX"
          hint="Operación SVI-AGU-2026-00031"
          icon={Car}
          palette="gold"
        />
        <KpiCard
          title="Pagos realizados"
          value={formatCurrency(15_500_000)}
          hint="2 pagos confirmados"
          icon={Wallet}
          palette="success"
        />
        <KpiCard
          title="Saldo pendiente"
          value={formatCurrency(26_500_000)}
          hint="Vence el 15/05/2026"
          icon={FileText}
          palette="warning"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado del trámite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Step done label="Reserva confirmada" date={formatDate(new Date("2026-04-10"))} />
            <Step done label="Documentación entregada" date={formatDate(new Date("2026-04-15"))} />
            <Step current label="Aprobación bancaria" date="En revisión" />
            <Step label="Entrega y patentamiento" />
            <Step label="Cierre y comprobantes" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DocLink label="Comprobante de reserva" />
            <DocLink label="Boleto de compra-venta" />
            <DocLink label="Detalle de financiación" />
            <p className="text-xs text-svi-muted-2 mt-4">
              Los documentos se actualizan automáticamente al avanzar el trámite.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Step({
  label,
  date,
  done,
  current,
}: {
  label: string;
  date?: string;
  done?: boolean;
  current?: boolean;
}) {
  const dot =
    done ? "bg-svi-success" : current ? "bg-svi-gold animate-pulse" : "bg-svi-elevated";
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className="flex-1">
        <p className={`font-medium ${current ? "text-svi-gold" : done ? "text-svi-white" : "text-svi-muted-2"}`}>
          {label}
        </p>
        {date && <p className="text-xs text-svi-muted-2">{date}</p>}
      </div>
      {done && <Badge variant="success">OK</Badge>}
      {current && <Badge variant="gold">En curso</Badge>}
    </div>
  );
}

function DocLink({ label }: { label: string }) {
  return (
    <a
      href="#"
      className="flex items-center gap-3 rounded-lg border border-svi-border-muted px-3 py-2.5 text-sm text-svi-muted hover:border-svi-gold/40 hover:text-svi-white transition-colors"
    >
      <FileCheck className="h-4 w-4 text-svi-gold" />
      <span className="flex-1">{label}</span>
      <span className="text-xs text-svi-muted-2">PDF</span>
    </a>
  );
}
