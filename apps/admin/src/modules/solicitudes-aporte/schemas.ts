import { z } from "zod";

export const ESTADOS_SOLICITUD = [
  "pendiente",
  "confirmada",
  "rechazada",
  "expirada",
] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const solicitudConfirmarSchema = z.object({
  id: z.string().uuid(),
  /** Si se omite, se usa monto_estimado de la solicitud. */
  monto_real: z.coerce.number().positive().optional(),
  /** Si se omite, se usa fecha_estimada. */
  fecha_real: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha YYYY-MM-DD requerida")
    .optional(),
  comprobante_url: z.string().url().optional().nullable().or(z.literal("")),
});

export const solicitudRechazarSchema = z.object({
  id: z.string().uuid(),
  motivo_rechazo: z.string().min(3).max(500),
});

export type SolicitudConfirmarInput = z.infer<typeof solicitudConfirmarSchema>;
export type SolicitudRechazarInput = z.infer<typeof solicitudRechazarSchema>;

export const LABEL_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  expirada: "Expirada",
};

export const COLOR_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: "bg-svi-warning/15 border-svi-warning/30 text-svi-warning",
  confirmada: "bg-svi-success/15 border-svi-success/30 text-svi-success",
  rechazada: "bg-svi-error/15 border-svi-error/30 text-svi-error",
  expirada: "bg-svi-elevated/40 border-svi-border-muted text-svi-muted-2",
};
