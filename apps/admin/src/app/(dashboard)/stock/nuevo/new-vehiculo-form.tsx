"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Textarea } from "@repo/ui";
import { vehiculoCreateSchema, type VehiculoCreateInput } from "@/modules/stock";
import { createVehiculo } from "@/modules/stock/actions";

interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
}

const TIPOS = ["auto", "4x4", "camioneta", "moto", "utilitario", "otro"] as const;
const CONDICIONES = ["0km", "usado"] as const;
const ESTADOS = ["stock", "reservado", "consignacion", "preparacion"] as const;

export function NewVehiculoForm({ sucursales }: { sucursales: Sucursal[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehiculoCreateInput>({
    resolver: zodResolver(vehiculoCreateSchema),
    defaultValues: {
      moneda: "ARS",
      estado: "stock",
      condicion: "0km",
      tipo: "auto",
      es_consignacion: false,
      equipamiento: [],
      fotos: [],
    },
  });

  async function onSubmit(values: VehiculoCreateInput) {
    setSubmitting(true);
    const res = await createVehiculo(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Vehículo creado");
    router.push(`/stock/${res.data.id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos básicos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Sucursal" htmlFor="sucursal_id" error={errors.sucursal_id?.message} required>
              <Select id="sucursal_id" {...register("sucursal_id")}>
                <option value="">Elegir sucursal...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.codigo})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo" htmlFor="tipo" error={errors.tipo?.message} required>
              <Select id="tipo" {...register("tipo")}>
                {TIPOS.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Condición" htmlFor="condicion" error={errors.condicion?.message} required>
              <Select id="condicion" {...register("condicion")}>
                {CONDICIONES.map((c) => (
                  <option key={c} value={c}>
                    {c === "0km" ? "0 KM" : "Usado"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado inicial" htmlFor="estado" error={errors.estado?.message}>
              <Select id="estado" {...register("estado")}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e} className="capitalize">
                    {e}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Marca" htmlFor="marca" error={errors.marca?.message} required>
              <Input id="marca" {...register("marca")} placeholder="Toyota" />
            </Field>

            <Field label="Modelo" htmlFor="modelo" error={errors.modelo?.message} required>
              <Input id="modelo" {...register("modelo")} placeholder="Hilux" />
            </Field>

            <Field label="Versión" htmlFor="version" error={errors.version?.message}>
              <Input id="version" {...register("version")} placeholder="SRX 4x4 AT" />
            </Field>

            <Field label="Año" htmlFor="anio" error={errors.anio?.message} required>
              <Input id="anio" type="number" {...register("anio")} placeholder="2026" />
            </Field>

            <Field label="Patente" htmlFor="patente" error={errors.patente?.message}>
              <Input id="patente" {...register("patente")} placeholder="AC123BD" className="font-mono uppercase" />
            </Field>

            <Field label="VIN / Chasis" htmlFor="vin" error={errors.vin?.message}>
              <Input id="vin" {...register("vin")} placeholder="17 caracteres" className="font-mono" />
            </Field>

            <Field label="Número interno" htmlFor="numero_interno" error={errors.numero_interno?.message}>
              <Input id="numero_interno" {...register("numero_interno")} placeholder="STK-001" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Especificaciones técnicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <Field label="Color" htmlFor="color" error={errors.color?.message}>
              <Input id="color" {...register("color")} placeholder="Blanco perla" />
            </Field>

            <Field label="Kilometraje" htmlFor="kilometraje" error={errors.kilometraje?.message} hint="0 si es 0KM">
              <Input id="kilometraje" type="number" {...register("kilometraje")} placeholder="0" />
            </Field>

            <Field label="Combustible" htmlFor="combustible" error={errors.combustible?.message}>
              <Select id="combustible" {...register("combustible")}>
                <option value="">—</option>
                <option value="Nafta">Nafta</option>
                <option value="Diesel">Diesel</option>
                <option value="GNC">GNC</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Eléctrico">Eléctrico</option>
              </Select>
            </Field>

            <Field label="Transmisión" htmlFor="transmision" error={errors.transmision?.message}>
              <Select id="transmision" {...register("transmision")}>
                <option value="">—</option>
                <option value="Manual">Manual</option>
                <option value="Automática">Automática</option>
                <option value="CVT">CVT</option>
                <option value="DCT">DCT</option>
              </Select>
            </Field>

            <Field label="Motor" htmlFor="motor" error={errors.motor?.message}>
              <Input id="motor" {...register("motor")} placeholder="2.0 turbo diesel" />
            </Field>

            <Field label="Puertas" htmlFor="puertas" error={errors.puertas?.message}>
              <Input id="puertas" type="number" {...register("puertas")} placeholder="4" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio y publicación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <Field label="Precio de compra" htmlFor="precio_compra" error={errors.precio_compra?.message} hint="Solo visible internamente">
              <Input id="precio_compra" type="number" step="0.01" {...register("precio_compra")} placeholder="0.00" />
            </Field>

            <Field label="Precio de venta" htmlFor="precio_venta" error={errors.precio_venta?.message} required>
              <Input id="precio_venta" type="number" step="0.01" {...register("precio_venta")} placeholder="0.00" />
            </Field>

            <Field label="Moneda" htmlFor="moneda" error={errors.moneda?.message} required>
              <Select id="moneda" {...register("moneda")}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </Select>
            </Field>

            <div className="md:col-span-3">
              <Field label="Foto principal (URL)" htmlFor="foto_principal_url" error={errors.foto_principal_url?.message} hint="La carga directa de imágenes llega en una iteración siguiente.">
                <Input id="foto_principal_url" type="url" {...register("foto_principal_url")} placeholder="https://..." />
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Observaciones" htmlFor="observaciones" error={errors.observaciones?.message}>
                <Textarea id="observaciones" {...register("observaciones")} placeholder="Detalles a destacar..." rows={3} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar vehículo
          </Button>
        </div>
      </form>
    </>
  );
}

function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-svi-dark border border-svi-border-muted text-svi-white rounded-lg px-4 py-2.5 text-sm focus:border-svi-gold focus:outline-none focus:ring-1 focus:ring-svi-gold ${className ?? ""}`}
    />
  );
}
