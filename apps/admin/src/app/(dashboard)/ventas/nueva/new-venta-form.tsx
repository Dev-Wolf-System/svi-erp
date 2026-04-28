"use client";

import { useState, useEffect } from "react";
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
import {
  ventaCreateSchema,
  TIPOS_PAGO,
  LABEL_TIPO_PAGO,
  type VentaCreateInput,
  type TipoPago,
} from "@/modules/ventas";
import { createVenta } from "@/modules/ventas/actions";

interface SucursalOpt {
  id: string;
  nombre: string;
  codigo: string;
}
interface VehiculoOpt {
  id: string;
  label: string;
  precio: number;
  moneda: string;
  sucursal_id: string;
}
interface ClienteOpt {
  id: string;
  label: string;
}
interface BancoOpt {
  id: string;
  label: string;
  tasa_sugerida: number | null | undefined;
  cuotas_sugeridas: number | null | undefined;
}

interface Props {
  sucursales: SucursalOpt[];
  vehiculos: VehiculoOpt[];
  clientes: ClienteOpt[];
  bancos: BancoOpt[];
}

export function NewVentaForm({ sucursales, vehiculos, clientes, bancos }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<VentaCreateInput>({
    resolver: zodResolver(ventaCreateSchema),
    defaultValues: {
      tipo_pago: "contado",
      moneda: "ARS",
      descuento: 0,
      precio_venta: 0,
      precio_final: 0,
    },
  });

  const tipoPago = useWatch({ control, name: "tipo_pago" });
  const vehiculoId = useWatch({ control, name: "vehiculo_id" });
  const precio = Number(useWatch({ control, name: "precio_venta" }) ?? 0);
  const descuento = Number(useWatch({ control, name: "descuento" }) ?? 0);
  const bancoId = useWatch({ control, name: "banco_id" });

  // Auto-completar precio + moneda + sucursal cuando se elige vehículo
  useEffect(() => {
    const v = vehiculos.find((x) => x.id === vehiculoId);
    if (v) {
      setValue("precio_venta", v.precio);
      setValue("moneda", v.moneda as "ARS" | "USD");
      setValue("sucursal_id", v.sucursal_id);
    }
  }, [vehiculoId, vehiculos, setValue]);

  // Recalcular precio final cuando cambia precio o descuento
  useEffect(() => {
    setValue("precio_final", Math.max(0, precio - descuento));
  }, [precio, descuento, setValue]);

  // Sugerencias de tasa/cuotas al elegir banco
  useEffect(() => {
    const b = bancos.find((x) => x.id === bancoId);
    if (b) {
      if (b.tasa_sugerida != null) setValue("tasa_banco", b.tasa_sugerida);
      if (b.cuotas_sugeridas != null) setValue("cuotas", b.cuotas_sugeridas);
    }
  }, [bancoId, bancos, setValue]);

  async function onSubmit(values: VentaCreateInput) {
    setSubmitting(true);
    const res = await createVenta(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Operación ${res.data.numero_operacion} creada`);
    router.push(`/ventas/${res.data.id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehículo y cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field
              label="Vehículo"
              htmlFor="vehiculo_id"
              error={errors.vehiculo_id?.message}
              required
            >
              <Select id="vehiculo_id" {...register("vehiculo_id")}>
                <option value="">Seleccionar...</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Cliente"
              htmlFor="cliente_id"
              error={errors.cliente_id?.message}
              required
            >
              <Select id="cliente_id" {...register("cliente_id")}>
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Sucursal"
              htmlFor="sucursal_id"
              error={errors.sucursal_id?.message}
              required
            >
              <Select id="sucursal_id" {...register("sucursal_id")}>
                <option value="">Seleccionar...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.codigo}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modalidad de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {TIPOS_PAGO.map((t) => (
                <RadioCard
                  key={t}
                  value={t}
                  label={LABEL_TIPO_PAGO[t]}
                  description={
                    t === "contado"
                      ? "Pago único"
                      : t === "financiado"
                        ? "Préstamo bancario"
                        : "Vehículo + saldo"
                  }
                  {...register("tipo_pago")}
                />
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <Field
                label="Precio de lista"
                htmlFor="precio_venta"
                error={errors.precio_venta?.message}
                required
              >
                <Input
                  id="precio_venta"
                  type="number"
                  step="1"
                  {...register("precio_venta")}
                  className="font-mono"
                />
              </Field>
              <Field
                label="Descuento"
                htmlFor="descuento"
                error={errors.descuento?.message}
              >
                <Input
                  id="descuento"
                  type="number"
                  step="1"
                  {...register("descuento")}
                  className="font-mono"
                />
              </Field>
              <Field
                label="Precio final"
                htmlFor="precio_final"
                error={errors.precio_final?.message}
                required
              >
                <Input
                  id="precio_final"
                  type="number"
                  step="1"
                  {...register("precio_final")}
                  className="font-mono"
                  readOnly
                />
              </Field>
              <Field label="Moneda" htmlFor="moneda">
                <Select id="moneda" {...register("moneda")}>
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {tipoPago === "parte_pago" && (
          <PartePagoSection
            vehiculos={vehiculos}
            register={register}
            error={errors.vehiculo_parte_id?.message}
          />
        )}

        {tipoPago === "financiado" && (
          <FinanciacionSection
            bancos={bancos}
            register={register}
            errors={{
              banco_id: errors.banco_id?.message,
              monto_financiado: errors.monto_financiado?.message,
              cuotas: errors.cuotas?.message,
              tasa_banco: errors.tasa_banco?.message,
            }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Comisión (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field
              label="Porcentaje (%)"
              htmlFor="comision_pct"
              error={errors.comision_pct?.message}
              hint="Snapshot inmutable — se congela al guardar"
            >
              <Input
                id="comision_pct"
                type="number"
                step="0.01"
                {...register("comision_pct")}
                className="font-mono"
              />
            </Field>
            <Field
              label="Monto"
              htmlFor="comision_monto"
              error={errors.comision_monto?.message}
            >
              <Input
                id="comision_monto"
                type="number"
                step="1"
                {...register("comision_monto")}
                className="font-mono"
              />
            </Field>
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
                placeholder="Detalles internos sobre la operación..."
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
            Crear reserva
          </Button>
        </div>
      </form>
    </>
  );
}

function PartePagoSection({
  vehiculos,
  register,
  error,
}: {
  vehiculos: VehiculoOpt[];
  register: ReturnType<typeof useForm<VentaCreateInput>>["register"];
  error?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehículo en parte de pago</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Vehículo recibido" htmlFor="vehiculo_parte_id" error={error}>
          <Select id="vehiculo_parte_id" {...register("vehiculo_parte_id")}>
            <option value="">Seleccionar (o cargar nuevo en Stock)...</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor reconocido" htmlFor="valor_parte">
          <Input
            id="valor_parte"
            type="number"
            step="1"
            {...register("valor_parte")}
            className="font-mono"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function FinanciacionSection({
  bancos,
  register,
  errors,
}: {
  bancos: BancoOpt[];
  register: ReturnType<typeof useForm<VentaCreateInput>>["register"];
  errors: {
    banco_id?: string;
    monto_financiado?: string;
    cuotas?: string;
    tasa_banco?: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financiación bancaria</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Banco" htmlFor="banco_id" error={errors.banco_id} required>
          <Select id="banco_id" {...register("banco_id")}>
            <option value="">Seleccionar...</option>
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="N° de legajo" htmlFor="legajo_banco">
          <Input
            id="legajo_banco"
            {...register("legajo_banco")}
            placeholder="LG-2026-..."
            className="font-mono"
          />
        </Field>
        <Field
          label="Monto financiado"
          htmlFor="monto_financiado"
          error={errors.monto_financiado}
          required
        >
          <Input
            id="monto_financiado"
            type="number"
            step="1"
            {...register("monto_financiado")}
            className="font-mono"
          />
        </Field>
        <Field label="Cuotas" htmlFor="cuotas" error={errors.cuotas} required>
          <Input
            id="cuotas"
            type="number"
            step="1"
            {...register("cuotas")}
            className="font-mono"
          />
        </Field>
        <Field
          label="TNA (%)"
          htmlFor="tasa_banco"
          error={errors.tasa_banco}
          required
        >
          <Input
            id="tasa_banco"
            type="number"
            step="0.01"
            {...register("tasa_banco")}
            className="font-mono"
          />
        </Field>
      </CardContent>
    </Card>
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
  value: TipoPago;
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
