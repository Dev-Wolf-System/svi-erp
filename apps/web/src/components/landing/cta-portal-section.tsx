"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Users, TrendingUp } from "lucide-react";
import { Button, Section } from "@repo/ui";

export function CtaPortalSection() {
  return (
    <Section id="portal" className="border-t border-svi-border-muted">
      <div className="grid gap-6 md:grid-cols-2">
        <PortalCard
          accent="red"
          icon={Users}
          eyebrow="Portal cliente"
          title="Seguí tu compra en tiempo real"
          description="Estado del trámite bancario, documentación, pagos realizados y comprobantes — todo en un solo lugar."
          href="/portal/cliente"
          cta="Acceder como cliente"
        />
        <PortalCard
          accent="gold"
          icon={TrendingUp}
          eyebrow="Portal inversor"
          title="Tu inversión, transparente"
          description="Capital actual, rendimientos acumulados, próximas liquidaciones y descarga de contratos. Acceso 24/7."
          href="/portal/inversor"
          cta="Acceder como inversor"
        />
      </div>
    </Section>
  );
}

function PortalCard({
  accent,
  icon: Icon,
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  accent: "red" | "gold";
  icon: typeof Users;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  const accentRing =
    accent === "red"
      ? "border-svi-red/30 hover:border-svi-red/60 hover:shadow-red"
      : "border-svi-gold/30 hover:border-svi-gold/60 hover:shadow-gold";
  const iconBg = accent === "red" ? "bg-svi-red/10 text-svi-red" : "bg-svi-gold/10 text-svi-gold";
  const eyebrowColor = accent === "red" ? "text-svi-red" : "text-svi-gold";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`group relative overflow-hidden rounded-2xl border bg-svi-card p-8 transition-all ${accentRing}`}
    >
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className={`mt-6 text-xs font-mono uppercase tracking-[0.25em] ${eyebrowColor}`}>
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-svi-white leading-tight">
        {title}
      </h3>
      <p className="mt-3 text-svi-muted-2 leading-relaxed">{description}</p>
      <Link href={href} className="block mt-6">
        <Button variant={accent === "red" ? "primary" : "secondary"} className="w-full sm:w-auto">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </motion.div>
  );
}
