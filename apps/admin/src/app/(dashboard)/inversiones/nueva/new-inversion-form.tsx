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
  inversionCreateSchema,
  TIPOS_INSTRUMENTO,
  ESTADOS_REGULATORIOS,
  LABEL_TIPO_INSTRUMENTO,
  LABEL_REGULATORIO,
  type InversionCreateInput,
} from "@/modules/inversiones/schemas";
import { createInversion } from "@/modules/inversiones/actions";

interface Props {
  inversores: { id: string; nombre: string; cuit: string | null; dni: string | null }[];
}

export function NewInversionForm({ inversores }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InversionCreateInput>({
    resolver: zodResolver(inversionCreateSchema),
    defaultValues: {
      moneda: "ARS",
      tipo_instrumento: "mutuo",
      estado_regulatorio: "pre_dictamen",
      firma_metodo: "presencial",
      fecha_inicio: today,
      config: {},
    },
  });

  async function onSubmit(values: InversionCreateInput) {
    setSubmitting(true);
    const res = await createInversion(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Inversión ${res.data.numero_contrato} creada`);
    router.push(`/inversiones/${res.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inversor</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Inversor"
            htmlFor="inversor_id"
            error={errors.inversor_id?.message}
            required
          >
            <Select id="inversor_id" {...register("inversor_id")}>
              <option value="">— Seleccionar —</option>
              {inversores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                  {i.cuit ? ` · CUIT ${i.cuit}` : i.dni ? ` · DNI ${i.dni}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capital y tasa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field
            label="Capital inicial"
            htmlFor="capital_inicial"
            error={errors.capital_inicial?.message}
            required
          >
            <Input
              id="capital_inicial"
              type="number"
              step="0.01"
              {...register("capital_inicial")}
              placeholder="1000000"
              className="font-mono"
            />
          </Field>
          <Field
            label="Moneda"
            htmlFor="moneda"
            error={errors.moneda?.message}
            required
          >
            <Select id="moneda" {...register("moneda")}>
              <option value="ARS">ARS — Pesos</option>
              <option value="USD">USD — Dólares</option>
            </Select>
          </Field>
          <Field
            label="Tasa mensual (%)"
            htmlFor="tasa_mensual"
            error={errors.tasa_mensual?.message}
            required
            hint="Porcentaje aplicado mes a mes sobre el capital actual"
          >
            <Input
              id="tasa_mensual"
              type="number"
              step="0.01"
              {...register("tasa_mensual")}
              placeholder="3.50"
              className="font-mono"
            />
          </Field>
          <Field
            label="Fecha de inicio"
            htmlFor="fecha_inicio"
            error={errors.fecha_inicio?.message}
            required
          >
            <Input
              id="fecha_inicio"
              type="date"
              {...register("fecha_inicio")}
            />
          </Field>
          <Field
            label="Vencimiento (opcional)"
            htmlFor="fecha_vencimiento"
            error={errors.fecha_vencimiento?.message}
            hint="Dejar vacío para inversión sin plazo definido"
          >
            <Input
              id="fecha_vencimiento"
              type="date"
              {...register("fecha_vencimiento")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Régimen legal
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-svi-warning/15 text-[10px] font-mono uppercase tracking-wider text-svi-warning">
              <ShieldAlert className="h-3 w-3" />
              Flex-first
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field
            label="Tipo de instrumento"
            htmlFor="tipo_instrumento"
            error={errors.tipo_instrumento?.message}
            required
            hint="Default 'mutuo' hasta dictamen legal definitivo (ADR 0007)"
          >
            <Select id="tipo_instrumento" {...register("tipo_instrumento")}>
              {TIPOS_INSTRUMENTO.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TIPO_INSTRUMENTO[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Estado regulatorio"
            htmlFor="estado_regulatorio"
            error={errors.estado_regulatorio?.message}
            required
          >
            <Select id="estado_regulatorio" {...register("estado_regulatorio")}>
              {ESTADOS_REGULATORIOS.map((e) => (
                <option key={e} value={e}>
                  {LABEL_REGULATORIO[e]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Método de firma"
            htmlFor="firma_metodo"
            error={errors.firma_metodo?.message}
            hint="Slot para firma electrónica externa (TokenSign, ZapSign, etc)"
          >
            <Select id="firma_metodo" {...register("firma_metodo")}>
              <option value="presencial">Presencial</option>
              <option value="digital_afip">Firma digital AFIP</option>
              <option value="tokensign">TokenSign</option>
              <option value="zapsign">ZapSign</option>
              <option value="firmar_ar">FirmaR</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Notas internas"
            htmlFor="observaciones"
            error={errors.observaciones?.message}
          >
            <Textarea
              id="observaciones"
              {...register("observaciones")}
              placeholder="Condiciones particulares, plazos especiales, referencia a documentación..."
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
          Registrar inversión
        </Button>
      </div>
    </form>
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
