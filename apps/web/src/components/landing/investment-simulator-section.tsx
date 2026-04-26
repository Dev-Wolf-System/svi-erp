"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Wallet, ArrowRight } from "lucide-react";
import { Button, GlassPanel, Section, SectionHeader, Field } from "@repo/ui";
import { formatCurrency } from "@repo/utils";

const MIN_CAPITAL = 1_000_000;
const MAX_CAPITAL = 50_000_000;
const STEP_CAPITAL = 500_000;

export function InvestmentSimulatorSection() {
  const [capital, setCapital] = useState(5_000_000);
  const [meses, setMeses] = useState(12);
  const [tasa, setTasa] = useState(5);

  const proyeccion = useMemo(() => {
    const rendimientoMensual = capital * (tasa / 100);
    const rendimientoTotal = rendimientoMensual * meses;
    const totalFinal = capital + rendimientoTotal;
    return { rendimientoMensual, rendimientoTotal, totalFinal };
  }, [capital, meses, tasa]);

  return (
    <Section id="inversion" className="border-t border-svi-border-muted">
      <SectionHeader
        eyebrow="Simulá tu inversión"
        title={
          <>
            Tu capital, <span className="gradient-text">trabajando</span>
          </>
        }
        description="Sistema de inversión con rendimientos mensuales respaldado por nuestro stock de vehículos. Liquidación puntual, contratos transparentes y atención personalizada."
      />

      <div className="grid gap-8 lg:grid-cols-5 lg:gap-12 items-stretch">
        {/* Controles */}
        <GlassPanel className="lg:col-span-3 p-8 md:p-10">
          <h3 className="font-display text-xl font-semibold text-svi-white">
            Configurá tu simulación
          </h3>
          <p className="mt-1 text-sm text-svi-muted-2">
            Ajustá los parámetros y vé el resultado en tiempo real.
          </p>

          <div className="mt-8 space-y-6">
            <Field
              label="Capital a invertir"
              hint={`Entre ${formatCurrency(MIN_CAPITAL)} y ${formatCurrency(MAX_CAPITAL)}`}
            >
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-svi-gold tabular-nums">
                    {formatCurrency(capital)}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_CAPITAL}
                  max={MAX_CAPITAL}
                  step={STEP_CAPITAL}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full accent-svi-red"
                  aria-label="Capital a invertir"
                />
              </div>
            </Field>

            <Field label="Plazo en meses">
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-svi-white tabular-nums">{meses}</span>
                  <span className="text-svi-muted-2 text-sm">meses</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={36}
                  step={1}
                  value={meses}
                  onChange={(e) => setMeses(Number(e.target.value))}
                  className="w-full accent-svi-gold"
                  aria-label="Plazo en meses"
                />
                <div className="flex justify-between text-xs text-svi-muted-2 font-mono">
                  <span>3m</span><span>12m</span><span>24m</span><span>36m</span>
                </div>
              </div>
            </Field>

            <Field label="Tasa mensual estimada" hint="Sujeta a contrato y condiciones vigentes.">
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-svi-success tabular-nums">{tasa}%</span>
                  <span className="text-svi-muted-2 text-sm">mensual</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  step={0.5}
                  value={tasa}
                  onChange={(e) => setTasa(Number(e.target.value))}
                  className="w-full accent-svi-success"
                  aria-label="Tasa mensual"
                />
              </div>
            </Field>
          </div>
        </GlassPanel>

        {/* Resultados */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <ResultCard
            icon={Wallet}
            label="Rendimiento mensual"
            value={formatCurrency(proyeccion.rendimientoMensual)}
            highlight="gold"
          />
          <ResultCard
            icon={TrendingUp}
            label={`Rendimiento total (${meses} meses)`}
            value={formatCurrency(proyeccion.rendimientoTotal)}
            highlight="success"
          />
          <motion.div
            key={proyeccion.totalFinal}
            initial={{ scale: 0.97, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-2xl border border-svi-red/30 bg-gradient-to-br from-svi-red/10 to-svi-card p-6"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-svi-muted-2">
              <Calendar className="h-3.5 w-3.5" />
              Total al finalizar
            </div>
            <p className="mt-2 font-display text-3xl md:text-4xl font-extrabold text-svi-white tabular-nums">
              {formatCurrency(proyeccion.totalFinal)}
            </p>
            <p className="mt-1 text-sm text-svi-muted-2">
              Capital + intereses acumulados
            </p>
          </motion.div>

          <Button size="lg" className="mt-2 w-full">
            Quiero ser inversor
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-center text-svi-muted-2">
            Te contactamos en menos de 24h hábiles.
          </p>
        </div>
      </div>
    </Section>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  highlight: "gold" | "success" | "red";
}) {
  const colors = {
    gold: "text-svi-gold border-svi-gold/30",
    success: "text-svi-success border-svi-success/30",
    red: "text-svi-red border-svi-red/30",
  } as const;
  return (
    <div className={`rounded-xl border ${colors[highlight]} bg-svi-card p-5`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-svi-muted-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${colors[highlight]}`}>
        {value}
      </p>
    </div>
  );
}
