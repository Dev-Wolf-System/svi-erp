"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from "@repo/ui";
import { clienteCreateSchema, type ClienteCreateInput } from "@/modules/clientes";
import { createCliente } from "@/modules/clientes/actions";

const PROVINCIAS_AR = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const ORIGENES = [
  "Web",
  "Showroom",
  "Referido",
  "Mercado Libre",
  "Instagram",
  "Facebook",
  "Otro",
];

export function NewClienteForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClienteCreateInput>({
    resolver: zodResolver(clienteCreateSchema),
    defaultValues: {
      tipo: "persona",
      portal_activo: false,
    },
  });

  const tipo = useWatch({ control, name: "tipo" });
  const esEmpresa = tipo === "empresa";

  async function onSubmit(values: ClienteCreateInput) {
    setSubmitting(true);
    const res = await createCliente(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Cliente creado");
    router.push(`/clientes/${res.data.id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tipo de cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <RadioCard
                value="persona"
                label="Persona física"
                description="DNI · individuo"
                {...register("tipo")}
              />
              <RadioCard
                value="empresa"
                label="Empresa"
                description="CUIT · razón social"
                {...register("tipo")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{esEmpresa ? "Datos de la empresa" : "Datos personales"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {esEmpresa ? (
              <>
                <Field
                  label="Razón social"
                  htmlFor="razon_social"
                  error={errors.razon_social?.message}
                  required
                >
                  <Input id="razon_social" {...register("razon_social")} placeholder="Sociedad SA" />
                </Field>
                <Field
                  label="Nombre de fantasía"
                  htmlFor="nombre"
                  error={errors.nombre?.message}
                  required
                >
                  <Input id="nombre" {...register("nombre")} placeholder="Tu Concesionaria" />
                </Field>
                <Field
                  label="CUIT"
                  htmlFor="cuit"
                  error={errors.cuit?.message}
                  required
                  hint="11 dígitos con DV válido"
                >
                  <Input id="cuit" {...register("cuit")} placeholder="20-12345678-6" className="font-mono" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message} required>
                  <Input id="nombre" {...register("nombre")} placeholder="Matías" />
                </Field>
                <Field label="Apellido" htmlFor="apellido" error={errors.apellido?.message}>
                  <Input id="apellido" {...register("apellido")} placeholder="Díaz" />
                </Field>
                <Field label="DNI" htmlFor="dni" error={errors.dni?.message}>
                  <Input id="dni" {...register("dni")} placeholder="12345678" className="font-mono" />
                </Field>
                <Field
                  label="CUIT/CUIL (opcional)"
                  htmlFor="cuit"
                  error={errors.cuit?.message}
                >
                  <Input id="cuit" {...register("cuit")} placeholder="20-12345678-6" className="font-mono" />
                </Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} placeholder="cliente@ejemplo.com" />
            </Field>
            <Field label="Celular" htmlFor="celular" error={errors.celular?.message}>
              <Input id="celular" {...register("celular")} placeholder="+54 9 381 ..." className="font-mono" />
            </Field>
            <Field label="Teléfono fijo" htmlFor="telefono" error={errors.telefono?.message}>
              <Input id="telefono" {...register("telefono")} placeholder="0381 ..." className="font-mono" />
            </Field>
            <Field label="Origen" htmlFor="origen" error={errors.origen?.message}>
              <Select id="origen" {...register("origen")}>
                <option value="">—</option>
                {ORIGENES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domicilio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-3">
              <Field label="Dirección" htmlFor="direccion" error={errors.direccion?.message}>
                <Input id="direccion" {...register("direccion")} placeholder="Av. Siempre Viva 742" />
              </Field>
            </div>
            <Field label="Localidad" htmlFor="localidad" error={errors.localidad?.message}>
              <Input id="localidad" {...register("localidad")} placeholder="Aguilares" />
            </Field>
            <Field label="Provincia" htmlFor="provincia" error={errors.provincia?.message}>
              <Select id="provincia" {...register("provincia")}>
                <option value="">—</option>
                {PROVINCIAS_AR.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-svi-muted">
                <input
                  type="checkbox"
                  {...register("portal_activo")}
                  className="h-4 w-4 rounded border-svi-border-muted bg-svi-dark text-svi-gold focus:ring-svi-gold"
                />
                Habilitar portal cliente
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Observaciones" htmlFor="notas" error={errors.notas?.message}>
              <Textarea
                id="notas"
                {...register("notas")}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cliente
          </Button>
        </div>
      </form>
    </>
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-svi-dark border border-svi-border-muted text-svi-white rounded-lg px-4 py-2.5 text-sm focus:border-svi-gold focus:outline-none focus:ring-1 focus:ring-svi-gold ${className ?? ""}`}
    />
  );
}

interface RadioCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  label: string;
  description: string;
}

const RadioCard = ({ value, label, description, ...rest }: RadioCardProps) => (
  <label className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-svi-border-muted bg-svi-dark p-4 has-[:checked]:border-svi-gold has-[:checked]:bg-svi-gold/5 transition-colors">
    <input type="radio" value={value} {...rest} className="peer sr-only" />
    <span className="text-sm font-semibold text-svi-white peer-checked:text-svi-gold">
      {label}
    </span>
    <span className="text-xs text-svi-muted-2">{description}</span>
  </label>
);
