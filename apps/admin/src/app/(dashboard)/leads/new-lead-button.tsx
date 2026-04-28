"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2, Save } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button, Field, Input, Textarea } from "@repo/ui";
import {
  leadCreateSchema,
  LEAD_ESTADOS,
  ESTADO_LABELS,
  type LeadCreateInput,
} from "@/modules/leads/schemas";
import { createLead } from "@/modules/leads/actions";

const ORIGENES = [
  "Web",
  "Showroom",
  "Referido",
  "Mercado Libre",
  "Instagram",
  "Facebook",
  "Otro",
];

export function NewLeadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadCreateInput>({
    resolver: zodResolver(leadCreateSchema),
    defaultValues: { estado: "nuevo" },
  });

  async function onSubmit(values: LeadCreateInput) {
    setSubmitting(true);
    const res = await createLead(values);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Lead creado");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo lead
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-svi-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-svi-border-muted bg-svi-card shadow-card max-h-[90vh] overflow-y-auto">
            <header className="flex items-center justify-between px-6 py-4 border-b border-svi-border-muted">
              <h2 className="font-display text-lg font-semibold text-svi-white">
                Cargar nuevo lead
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-svi-muted-2 hover:text-svi-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message} required>
                <Input id="nombre" {...register("nombre")} placeholder="Nombre o razón social" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" htmlFor="email" error={errors.email?.message}>
                  <Input id="email" type="email" {...register("email")} placeholder="cliente@ejemplo.com" />
                </Field>
                <Field label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
                  <Input id="telefono" {...register("telefono")} placeholder="+54 9 ..." className="font-mono" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado inicial" htmlFor="estado" error={errors.estado?.message}>
                  <Select id="estado" {...register("estado")}>
                    {LEAD_ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {ESTADO_LABELS[e]}
                      </option>
                    ))}
                  </Select>
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
              </div>

              <Field label="Mensaje / interés" htmlFor="mensaje" error={errors.mensaje?.message}>
                <Textarea
                  id="mensaje"
                  {...register("mensaje")}
                  placeholder="Vehículo de interés, presupuesto, observaciones..."
                  rows={3}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Crear lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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
