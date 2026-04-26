"use client";

import { motion } from "framer-motion";
import { ArrowRight, Fuel, Gauge, MapPin } from "lucide-react";
import Image from "next/image";
import { Badge, Button, Section, SectionHeader } from "@repo/ui";
import { formatCurrencyCompact, formatNumber } from "@repo/utils";
import { vehiculosMock } from "@/data/vehiculos-mock";

export function CatalogPreviewSection() {
  return (
    <Section id="catalogo" className="border-t border-svi-border-muted bg-svi-dark/30">
      <SectionHeader
        eyebrow="Stock disponible"
        title={
          <>
            Catálogo <span className="text-svi-gold">curado</span>
          </>
        }
        description="Una muestra del stock actual. Filtramos cada unidad por estado mecánico, historial documentado y presentación impecable. El catálogo completo se actualiza al instante."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vehiculosMock.map((v, idx) => (
          <motion.article
            key={v.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.55,
              delay: (idx % 3) * 0.08,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="group relative overflow-hidden rounded-2xl border border-svi-border-muted bg-svi-card transition-all duration-300 hover:border-svi-gold/40 hover:shadow-card hover:-translate-y-1"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={v.imagen}
                alt={`${v.marca} ${v.modelo} ${v.anio}`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 vehicle-card-overlay" />

              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant={v.condicion === "0km" ? "success" : "default"}>
                  {v.condicion === "0km" ? "0 km" : "Usado"}
                </Badge>
                {v.destacado && <Badge variant="gold">Destacado</Badge>}
              </div>
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-svi-black/70 px-2.5 py-1 text-xs text-svi-muted backdrop-blur-md">
                <MapPin className="h-3 w-3" /> {v.sucursal}
              </span>

              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs uppercase tracking-widest text-svi-gold/90 font-mono">
                  {v.marca}
                </p>
                <h3 className="font-display text-xl font-bold text-svi-white">
                  {v.modelo} <span className="text-svi-muted">{v.version}</span>
                </h3>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4 text-xs text-svi-muted-2">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  {v.kilometraje !== undefined ? `${formatNumber(v.kilometraje, 0)} km` : "0 km"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Fuel className="h-3.5 w-3.5" />
                  {v.combustible}
                </span>
                <span className="ml-auto font-mono text-svi-muted">{v.anio}</span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-svi-muted-2 uppercase tracking-wider">Precio</p>
                  <p className="font-display text-2xl font-bold text-svi-gold tabular-nums">
                    {formatCurrencyCompact(v.precio, v.moneda)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-svi-gold">
                  Detalles <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button size="lg" variant="secondary">
          Ver catálogo completo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Section>
  );
}
