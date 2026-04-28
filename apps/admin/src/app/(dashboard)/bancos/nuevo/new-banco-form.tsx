"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { bancoCreateSchema, type BancoCreateInput } from "@/modules/bancos";
import { createBanco } from "@/modules/bancos/actions";

export function NewBancoForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BancoCreateInput>({
    resolver: zodResolver(bancoCreateSchema),
    defaultValues: {
      activo: true,
      condiciones: {},
    },
  });

  async function onSubmit(values: BancoCreateInput) {
    setSubmitting(true);
    const res = await createBanco(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Banco creado");
    router.push(`/bancos/${res.data.id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field
              label="Nombre"
              htmlFor="nombre"
              error={errors.nombre?.message}
              required
            >
              <Input id="nombre" {...register("nombre")} placeholder="Banco Galicia" />
            </Field>
            <Field
              label="Persona de contacto"
              htmlFor="contacto"
              error={errors.contacto?.message}
            >
              <Input id="contacto" {...register("contacto")} placeholder="Juan Pérez" />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="ejecutivo@banco.com.ar"
              />
            </Field>
            <Field label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
              <Input
                id="telefono"
                {...register("telefono")}
                placeholder="0381 ..."
                className="font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condiciones crediticias</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <Field
              label="Tasa mínima (TNA %)"
              htmlFor="tasa_min"
              hint="Ej: 65"
            >
              <Input
                id="tasa_min"
                type="number"
                step="0.01"
                {...register("condiciones.tasa_min")}
                className="font-mono"
              />
            </Field>
            <Field
              label="Tasa máxima (TNA %)"
              htmlFor="tasa_max"
              hint="Ej: 95"
            >
              <Input
                id="tasa_max"
                type="number"
                step="0.01"
                {...register("condiciones.tasa_max")}
                className="font-mono"
              />
            </Field>
            <Field label="Monto máximo (ARS)" htmlFor="monto_max">
              <Input
                id="monto_max"
                type="number"
                step="1"
                {...register("condiciones.monto_max")}
                className="font-mono"
              />
            </Field>
            <Field label="Cuotas mínimas" htmlFor="cuotas_min">
              <Input
                id="cuotas_min"
                type="number"
                step="1"
                {...register("condiciones.cuotas_min")}
              />
            </Field>
            <Field label="Cuotas máximas" htmlFor="cuotas_max">
              <Input
                id="cuotas_max"
                type="number"
                step="1"
                {...register("condiciones.cuotas_max")}
              />
            </Field>
            <div className="md:col-span-3">
              <Field label="Requisitos" htmlFor="requisitos">
                <Textarea
                  id="requisitos"
                  {...register("condiciones.requisitos")}
                  placeholder="Recibo de sueldo últimos 3 meses, antigüedad mínima 6 meses..."
                  rows={3}
                />
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
            Guardar banco
          </Button>
        </div>
      </form>
    </>
  );
}
