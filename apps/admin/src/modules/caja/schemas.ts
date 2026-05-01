import { z } from "zod";

export const TIPO_MOVIMIENTO = ["ingreso", "egreso"] as const;
export type TipoMovimiento = (typeof TIPO_MOVIMIENTO)[number];

export const MONEDAS = ["ARS", "USD"] as const;
export type Moneda = (typeof MONEDAS)[number];

// Categorías fijas para la concesionaria
export const CATEGORIAS_INGRESO = [
  { value: "venta_contado",      label: "Venta contado" },
  { value: "venta_anticipo",     label: "Anticipo / señal de venta" },
  { value: "cobro_cuota",        label: "Cobro cuota financiada" },
  { value: "inversion_capital",  label: "Ingreso de capital FCI" },
  { value: "transferencia",      label: "Transferencia recibida" },
  { value: "otro_ingreso",       label: "Otro ingreso" },
] as const;

export const CATEGORIAS_EGRESO = [
  { value: "compra_vehiculo",         label: "Compra de vehículo" },
  { value: "liquidacion_inversion",   label: "Pago liquidación FCI" },
  { value: "gasto_operativo",         label: "Gasto operativo" },
  { value: "pago_proveedor",          label: "Pago a proveedor" },
  { value: "retiro",                  label: "Retiro de fondos" },
  { value: "transferencia",           label: "Transferencia enviada" },
  { value: "otro_egreso",             label: "Otro egreso" },
] as const;

export const movimientoCreateSchema = z.object({
  sucursal_id:       z.string().uuid(),
  tipo:              z.enum(TIPO_MOVIMIENTO),
  categoria:         z.string().min(1).max(50),
  concepto:          z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
  monto:             z.number({ invalid_type_error: "Ingresá un monto" }).positive("El monto debe ser mayor a 0"),
  moneda:            z.enum(MONEDAS).default("ARS"),
  fecha_operacion:   z.string().datetime().optional(),
  comprobante_url:   z.string().url("URL inválida").nullable().optional(),
  ref_tipo:          z.string().max(30).nullable().optional(),
  ref_id:            z.string().uuid().nullable().optional(),
});

export type MovimientoCreateInput = z.infer<typeof movimientoCreateSchema>;

export const cierreCreateSchema = z.object({
  sucursal_id:   z.string().uuid(),
  fecha:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observaciones: z.string().trim().max(500).nullable().optional(),
});

export type CierreCreateInput = z.infer<typeof cierreCreateSchema>;

// ─── Tipos de salida ──────────────────────────────────────────────────────────

export type MovimientoRow = {
  id:               string;
  sucursal_id:      string;
  tipo:             TipoMovimiento;
  categoria:        string;
  concepto:         string;
  monto:            number;
  moneda:           Moneda;
  fecha_operacion:  string;
  registrado_por:   string | null;
  comprobante_url:  string | null;
  cierre_id:        string | null;
  ref_tipo:         string | null;
  ref_id:           string | null;
  created_at:       string;
};

export type CierreRow = {
  id:             string;
  sucursal_id:    string;
  fecha:          string;
  total_ingresos: number;
  total_egresos:  number;
  saldo:          number;
  cerrado_por:    string | null;
  observaciones:  string | null;
  created_at:     string;
};

export type ResumenDia = {
  total_ingresos: number;
  total_egresos:  number;
  saldo:          number;
  count:          number;
  cerrado:        boolean;
  cierre:         CierreRow | null;
};
