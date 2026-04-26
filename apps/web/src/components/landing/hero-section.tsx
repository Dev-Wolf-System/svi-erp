"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@repo/ui";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacityContent = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center hero-mesh"
    >
      {/* Grid pattern + parallax */}
      <motion.div
        style={{ y: yBg }}
        className="absolute inset-0 bg-grid-pattern opacity-60"
        aria-hidden
      />
      <div className="noise-overlay" aria-hidden />

      {/* Halo gold suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(197,160,89,0.40), transparent)" }}
      />

      <motion.div
        style={{ opacity: opacityContent }}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-5xl px-6 md:px-10 text-center"
      >
        <motion.span
          variants={itemVariants}
          className="inline-flex items-center gap-2 rounded-full border border-svi-gold/30 bg-svi-card/60 px-4 py-1.5 text-xs font-mono uppercase tracking-[0.25em] text-svi-gold backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-svi-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-svi-red" />
          </span>
          Líderes en el mercado automotor de Tucumán
        </motion.span>

        <motion.h1
          variants={itemVariants}
          className="mt-8 font-display font-extrabold tracking-tight text-svi-white text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95]"
        >
          Vehículos que <span className="gradient-text">definen</span>
          <br />
          un estilo.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-svi-muted-2 leading-relaxed"
        >
          Concesionaria premium con stock seleccionado de 0KM y usados, financiación bancaria
          a medida y un sistema de inversión que rinde mes a mes. Tres sucursales, una sola promesa:{" "}
          <span className="text-svi-white">vehículos impecables, atención impecable</span>.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a href="#catalogo">
            <Button size="lg">
              Ver catálogo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <a href="#inversion">
            <Button variant="secondary" size="lg">
              Quiero invertir
            </Button>
          </a>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-svi-muted-2"
        >
          <Stat value="3" label="Sucursales activas" />
          <Divider />
          <Stat value="500+" label="Vehículos vendidos" />
          <Divider />
          <Stat value="5%" label="Tasa mensual FCI" />
          <Divider />
          <span className="inline-flex items-center gap-1.5 text-svi-gold">
            <MapPin className="h-4 w-4" /> Tucumán, Argentina
          </span>
        </motion.div>
      </motion.div>

      {/* Indicador de scroll */}
      <motion.a
        href="#valor"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-2 text-svi-muted-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        aria-label="Continuar leyendo"
      >
        <span className="text-xs font-mono uppercase tracking-widest">Explorar</span>
        <ChevronDown className="h-4 w-4" />
      </motion.a>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold text-svi-white tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wider">{label}</span>
    </span>
  );
}

function Divider() {
  return <span className="hidden sm:inline h-4 w-px bg-svi-border-muted" />;
}
