"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Banknote, TrendingUp, type LucideIcon } from "lucide-react";
import { GlassPanel, Section, SectionHeader } from "@repo/ui";

interface ValueProp {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "red" | "gold" | "silver";
}

const props: ValueProp[] = [
  {
    icon: ShieldCheck,
    title: "Stock impecable",
    description:
      "Cada unidad pasa por inspección técnica rigurosa antes de salir al salón. Cero sorpresas, cero compromisos.",
    accent: "red",
  },
  {
    icon: Banknote,
    title: "Financiación a medida",
    description:
      "Convenios con los principales bancos del país. Aprobación rápida, cuotas que se ajustan a vos.",
    accent: "gold",
  },
  {
    icon: TrendingUp,
    title: "Inversión con rendimiento",
    description:
      "Sistema de inversión propio con liquidaciones mensuales. Tu capital trabaja con respaldo de activos reales.",
    accent: "silver",
  },
];

const accentClasses: Record<ValueProp["accent"], { ring: string; iconBg: string; iconColor: string }> = {
  red: { ring: "hover:border-svi-red/40 hover:shadow-red", iconBg: "bg-svi-red/10", iconColor: "text-svi-red" },
  gold: { ring: "hover:border-svi-gold/40 hover:shadow-gold", iconBg: "bg-svi-gold/10", iconColor: "text-svi-gold" },
  silver: { ring: "hover:border-svi-silver/40", iconBg: "bg-svi-silver/10", iconColor: "text-svi-silver" },
};

export function ValuePropsSection() {
  return (
    <Section id="valor" className="border-t border-svi-border-muted">
      <SectionHeader
        eyebrow="Lo que nos diferencia"
        title={
          <>
            Tres razones para <span className="gradient-text">elegir SVI</span>
          </>
        }
        description="Nos obsesiona la calidad del producto y la experiencia del cliente. Cada parte del proceso fue pensada para que comprar o invertir con nosotros sea fluido y transparente."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {props.map((p, idx) => {
          const Icon = p.icon;
          const ac = accentClasses[p.accent];
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: idx * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <GlassPanel
                className={`group relative p-7 transition-all duration-300 ${ac.ring}`}
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${ac.iconBg}`}
                >
                  <Icon className={`h-6 w-6 ${ac.iconColor}`} />
                </div>
                <h3 className="font-display text-xl font-semibold text-svi-white">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm text-svi-muted-2 leading-relaxed">
                  {p.description}
                </p>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
