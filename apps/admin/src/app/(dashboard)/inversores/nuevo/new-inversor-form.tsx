"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ShieldAlert } from "lucide-react";
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
import {
  inversorCreateSchema,
  type InversorCreateInput,
} from "@/modules/inversores/schemas";
import { createInversor } from "@/modules/inversores/actions";

export function NewInversorForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InversorCreateInput>({
    resolver: zodResolver(inversorCreateSchema),
    defaultValues: { portal_activo: false, config: {} },
  });

  async function onSubmit(values: InversorCreateInput) {
    setSubmitting(true);
    const res = await createInversor(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Inversor creado");
    router.push(`/inversores/${res.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              label="Nombre completo"
              htmlFor="nombre"
              error={errors.nombre?.message}
              required
            >
              <Input id="nombre" {...register("nombre")} placeholder="Juan Pérez" />
            </Field>
          </div>
          <Field label="DNI" htmlFor="dni" error={errors.dni?.message}>
            <Input
              id="dni"
              {...register("dni")}
              placeholder="12345678"
              className="font-mono"
            />
          </Field>
          <Field
            label="CUIT/CUIL"
            htmlFor="cuit"
            error={errors.cuit?.message}
            hint="11 dígitos con DV válido"
          >
            <Input
              id="cuit"
              {...register("cuit")}
              placeholder="20-12345678-6"
              className="font-mono"
            />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="inversor@ejemplo.com"
            />
          </Field>
          <Field label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
            <Input
              id="telefono"
              {...register("telefono")}
              placeholder="+54 9 381 ..."
              className="font-mono"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Datos bancarios
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-svi-warning/15 text-[10px] font-mono uppercase tracking-wider text-svi-warning">
              <ShieldAlert className="h-3 w-3" />
              Sensible
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field
            label="CBU"
            htmlFor="cbu"
            error={errors.cbu?.message}
            hint="22 dígitos sin espacios"
          >
            <Input
              id="cbu"
              {...register("cbu")}
              placeholder="0110123456789012345678"
              className="font-mono"
            />
          </Field>
          <Field
            label="Alias"
            htmlFor="alias"
            error={errors.alias?.message}
            hint="6-30 caracteres"
          >
            <Input
              id="alias"
              {...register("alias")}
              placeholder="juan.perez.svi"
              className="font-mono"
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="Banco"
              htmlFor="banco_nombre"
              error={errors.banco_nombre?.message}
            >
              <Input
                id="banco_nombre"
                {...register("banco_nombre")}
                placeholder="Banco Galicia"
              />
            </Field>
          </div>
          <div className="md:col-span-2 text-[11px] text-svi-muted-2 leading-relaxed">
            Estos datos se almacenan en la base de datos para procesar las
            liquidaciones. El cifrado pgsodium está pendiente de configurar antes
            de operación productiva — ver <code>docs/PRODUCTION_HARDENING.md §13</code>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acceso al portal</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="inline-flex items-center gap-2 text-sm text-svi-muted">
            <input
              type="checkbox"
              {...register("portal_activo")}
              className="h-4 w-4 rounded border-svi-border-muted bg-svi-dark text-svi-gold focus:ring-svi-gold"
            />
            Habilitar acceso al portal de inversor
          </label>
          <p className="mt-2 text-[11px] text-svi-muted-2">
            El usuario podrá ver sus inversiones, liquidaciones y descargar
            contratos. Requiere asociar un usuario auth (paso siguiente — F5.6).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas internas</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Observaciones" htmlFor="notas" error={errors.notas?.message}>
            <Textarea
              id="notas"
              {...register("notas")}
              placeholder="Notas internas sobre el inversor..."
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
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar inversor
        </Button>
      </div>
    </form>
  );
}
