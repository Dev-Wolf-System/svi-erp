"use client";

import { motion } from "framer-motion";
import { Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { Button, Section, SectionHeader } from "@repo/ui";

const sucursales = [
  {
    nombre: "Aguilares",
    direccion: "Av. Sarmiento 100, Aguilares, Tucumán",
    telefono: "+54 9 3865 555-0001",
    horario: "Lun a Sáb 9:00 — 20:00",
    mapsUrl: "https://maps.google.com/?q=Aguilares+Tucuman",
  },
  {
    nombre: "Concepción",
    direccion: "Av. Mitre 500, Concepción, Tucumán",
    telefono: "+54 9 3865 555-0002",
    horario: "Lun a Sáb 9:00 — 20:00",
    mapsUrl: "https://maps.google.com/?q=Concepcion+Tucuman",
  },
  {
    nombre: "S.M. de Tucumán",
    direccion: "Av. Mate de Luna 1500, San Miguel de Tucumán",
    telefono: "+54 9 3815 555-0003",
    horario: "Lun a Sáb 9:00 — 20:00",
    mapsUrl: "https://maps.google.com/?q=San+Miguel+Tucuman",
  },
];

export function LocationsSection() {
  return (
    <Section id="sucursales" className="border-t border-svi-border-muted bg-svi-dark/40">
      <SectionHeader
        eyebrow="Tres sucursales — una experiencia"
        title={
          <>
            Cerca tuyo, <span className="text-svi-gold">en Tucumán</span>
          </>
        }
        description="Operamos con stock unificado entre las tres sucursales. Si el vehículo que querés está en otra, lo trasladamos sin costo."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {sucursales.map((s, idx) => (
          <motion.div
            key={s.nombre}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.5,
              delay: idx * 0.1,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="group relative overflow-hidden rounded-2xl border border-svi-border-muted bg-svi-card p-7 transition-all hover:border-svi-gold/40 hover:shadow-card"
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-svi-red/5 blur-2xl group-hover:bg-svi-red/10 transition-colors" />

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-svi-gold/10">
                <MapPin className="h-5 w-5 text-svi-gold" />
              </div>
              <h3 className="font-display text-2xl font-bold text-svi-white">{s.nombre}</h3>
            </div>

            <div className="mt-5 space-y-3 text-sm text-svi-muted-2">
              <p>{s.direccion}</p>
              <p className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-svi-gold" />
                {s.telefono}
              </p>
              <p className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-svi-gold" />
                {s.horario}
              </p>
            </div>

            <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="block mt-6">
              <Button variant="ghost" className="w-full justify-start text-svi-gold">
                Cómo llegar <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </a>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
