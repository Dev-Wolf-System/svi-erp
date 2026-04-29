import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import {
  getLiquidaciones,
  getLiquidacionesStats,
} from "@/modules/liquidaciones-inversion/queries";
import { liquidacionFiltersSchema } from "@/modules/liquidaciones-inversion/schemas";
import { LiquidacionesFilters } from "./liquidaciones-filters";
import { LiquidacionesTable } from "./liquidaciones-table";
import { GenerarMesActualButton } from "./generar-mes-actual-button";

export const metadata = { title: "Liquidaciones" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LiquidacionesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = liquidacionFiltersSchema.parse(params);

  const [liquidaciones, stats] = await Promise.all([
    getLiquidaciones(filters),
    getLiquidacionesStats(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · pagos a inversores
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-svi-white">
            Liquidaciones{" "}
            <Badge variant="default" className="ml-2 align-middle">
              {stats.pendientes} pendientes
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-svi-muted-2">
            Pagos mensuales calculados sobre el capital de cada inversión
            activa. La generación es idempotente (no duplica el mes).
          </p>
        </div>
        <GenerarMesActualButton />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pendientes" value={String(stats.pendientes)} accent="warning" />
        <StatCard label="Pagadas" value={String(stats.pagadas)} accent="success" />
        <StatCard
          label="A pagar (ARS)"
          value={formatCurrency(stats.total_pendiente_ars, "ARS")}
          mono
        />
        <StatCard
          label="A pagar (USD)"
          value={formatCurrency(stats.total_pendiente_usd, "USD")}
          mono
        />
      </div>

      <LiquidacionesFilters currentFilters={filters} />

      {liquidaciones.length === 0 ? (
        <EmptyState />
      ) : (
        <LiquidacionesTable items={liquidaciones} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: "success" | "warning";
}) {
  const accentCls =
    accent === "success"
      ? "text-svi-success"
      : accent === "warning"
        ? "text-svi-warning"
        : "text-svi-white";
  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card/60 p-4">
      <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">{label}</p>
      <p
        className={`mt-1 text-xl ${mono ? "font-mono" : "font-display font-bold"} ${accentCls}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-16 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-svi-elevated">
        <Receipt className="h-6 w-6 text-svi-muted-2" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">
        Sin liquidaciones registradas
      </h3>
      <p className="mt-2 text-sm text-svi-muted-2 max-w-md mx-auto">
        Las liquidaciones se generan al final del período mensual o
        manualmente con el botón &ldquo;Generar mes actual&rdquo;.
      </p>
      <p className="mt-4 text-xs text-svi-muted-2">
        Asegurate de tener inversiones en estado{" "}
        <Link href="/inversiones" className="text-svi-gold hover:underline">
          activa
        </Link>
        .
      </p>
    </div>
  );
}
