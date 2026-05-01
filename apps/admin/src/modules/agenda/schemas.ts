import { z } from "zod";

// ─── Enums (espejo de los de Postgres) ──────────────────────────────────────

export const RECURSO_TIPOS = ["owner", "asesor", "vendedor", "sala"] as const;
export type RecursoTipo = (typeof RECURSO_TIPOS)[number];

export const TURNO_ESTADOS = [
  "solicitado",
  "confirmado",
  "cumplido",
  "cancelado",
  "no_show",
] as const;
export type TurnoEstado = (typeof TURNO_ESTADOS)[number];

export const TURNO_MODALIDADES = ["presencial", "videollamada", "telefono"] as const;
export type TurnoModalidad = (typeof TURNO_MODALIDADES)[number];

export const PERSONA_TIPOS = ["cliente", "inversor", "lead", "externo"] as const;
export type PersonaTipo = (typeof PERSONA_TIPOS)[number];

export const SLOT_MINUTOS = [15, 20, 30, 45, 60, 90, 120] as const;
export type SlotMinutos = (typeof SLOT_MINUTOS)[number];

// ─── Recursos ───────────────────────────────────────────────────────────────

export const recursoCreateSchema = z.object({
  tipo: z.enum(RECURSO_TIPOS),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  sucursal_id: z.string().uuid().nullable().optional(),
  usuario_id: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Formato HEX (#RRGGBB)")
    .default("#C5A059"),
  activo: z.boolean().default(true),
  notas: z.string().trim().max(500).nullable().optional(),
});

export const recursoUpdateSchema = recursoCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type RecursoCreateInput = z.infer<typeof recursoCreateSchema>;
export type RecursoUpdateInput = z.infer<typeof recursoUpdateSchema>;

// ─── Disponibilidad (franjas semanales recurrentes) ─────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const disponibilidadCreateSchema = z
  .object({
    recurso_id: z.string().uuid(),
    dia_semana: z.number().int().min(0).max(6),
    hora_inicio: z.string().regex(TIME_REGEX, "Formato HH:MM"),
    hora_fin: z.string().regex(TIME_REGEX, "Formato HH:MM"),
    slot_minutos: z
      .union([z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)])
      .default(30),
    vigente_desde: z.string().date().nullable().optional(),
    vigente_hasta: z.string().date().nullable().optional(),
  })
  .refine((d) => d.hora_fin > d.hora_inicio, {
    message: "hora_fin debe ser mayor a hora_inicio",
    path: ["hora_fin"],
  });

export type DisponibilidadCreateInput = z.infer<typeof disponibilidadCreateSchema>;

// ─── Bloqueos (excepciones puntuales) ───────────────────────────────────────

export const bloqueoCreateSchema = z
  .object({
    recurso_id: z.string().uuid(),
    desde: z.string().datetime(),
    hasta: z.string().datetime(),
    motivo: z.string().trim().max(200).nullable().optional(),
  })
  .refine((d) => new Date(d.hasta) > new Date(d.desde), {
    message: "hasta debe ser posterior a desde",
    path: ["hasta"],
  });

export type BloqueoCreateInput = z.infer<typeof bloqueoCreateSchema>;

// ─── Turnos ─────────────────────────────────────────────────────────────────

export const turnoCreateSchema = z
  .object({
    recurso_id: z.string().uuid(),
    persona_tipo: z.enum(PERSONA_TIPOS),
    persona_id: z.string().uuid().nullable().optional(),
    externo_nombre: z.string().trim().max(100).nullable().optional(),
    externo_telefono: z.string().trim().max(20).nullable().optional(),
    inicio: z.string().datetime(),
    fin: z.string().datetime(),
    modalidad: z.enum(TURNO_MODALIDADES).default("presencial"),
    motivo: z.string().trim().min(2, "Indicá motivo del turno").max(200),
    notas: z.string().trim().max(500).nullable().optional(),
    external_ref: z.string().trim().max(120).nullable().optional(),
  })
  .refine((d) => new Date(d.fin) > new Date(d.inicio), {
    message: "fin debe ser posterior a inicio",
    path: ["fin"],
  })
  .refine(
    (d) =>
      d.persona_tipo === "externo"
        ? !!d.externo_nombre?.trim()
        : !!d.persona_id,
    {
      message:
        "Para personas internas (cliente/inversor/lead) elegir un registro. Para externo, cargar nombre.",
      path: ["persona_id"],
    },
  );

export const turnoUpdateEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(TURNO_ESTADOS),
  cancelado_motivo: z.string().trim().max(200).nullable().optional(),
});

export const turnoReprogramarSchema = z
  .object({
    id: z.string().uuid(),
    inicio: z.string().datetime(),
    fin: z.string().datetime(),
    motivo_reprogramacion: z.string().trim().max(200).nullable().optional(),
  })
  .refine((d) => new Date(d.fin) > new Date(d.inicio), {
    message: "fin debe ser posterior a inicio",
    path: ["fin"],
  });

export type TurnoCreateInput = z.infer<typeof turnoCreateSchema>;
export type TurnoUpdateEstadoInput = z.infer<typeof turnoUpdateEstadoSchema>;
export type TurnoReprogramarInput = z.infer<typeof turnoReprogramarSchema>;

// ─── Tipos de salida (usados por UI y queries) ──────────────────────────────

export type Recurso = {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  tipo: RecursoTipo;
  nombre: string;
  usuario_id: string | null;
  color: string;
  activo: boolean;
  notas: string | null;
};

export type DisponibilidadFranja = {
  id: string;
  recurso_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  slot_minutos: SlotMinutos;
  vigente_desde: string | null;
  vigente_hasta: string | null;
};

export type Bloqueo = {
  id: string;
  recurso_id: string;
  desde: string;
  hasta: string;
  motivo: string | null;
};

export type Turno = {
  id: string;
  empresa_id: string;
  recurso_id: string;
  persona_tipo: PersonaTipo;
  persona_id: string | null;
  externo_nombre: string | null;
  externo_telefono: string | null;
  inicio: string;
  fin: string;
  estado: TurnoEstado;
  modalidad: TurnoModalidad;
  motivo: string;
  notas: string | null;
  creado_por: string;
  external_ref: string | null;
  cancelado_motivo: string | null;
  cancelado_at: string | null;
  cancelado_por: string | null;
  created_at: string;
  recurso_nombre: string | null;
  recurso_color: string | null;
  persona_label: string | null;
};

// ─── Filtros para queries ───────────────────────────────────────────────────

export const turnosRangoFiltersSchema = z.object({
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
  recurso_id: z.string().uuid().optional(),
  estado: z.enum(TURNO_ESTADOS).optional(),
});

export type TurnosRangoFilters = z.infer<typeof turnosRangoFiltersSchema>;
