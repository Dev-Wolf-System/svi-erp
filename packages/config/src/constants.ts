/**
 * Constantes globales del proyecto SVI.
 * Si una constante depende de la empresa o sucursal, debe vivir en empresas.config JSONB,
 * no acá (ver §3.3.E del plan).
 */

export const APP_NAME = "SVI";
export const APP_LONG_NAME = "Solo Vehículos Impecables";
export const APP_TAGLINE = "Vehículos que definen un estilo";

export const TIMEZONE_AR = "America/Argentina/Buenos_Aires";
export const LOCALE_AR = "es-AR";

export const DEFAULT_CURRENCY = "ARS" as const;
export const SUPPORTED_CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Roles del sistema (sincronizado con §8.1 del plan) */
export const ROLES = [
  "super_admin",
  "admin",
  "gerente",
  "vendedor",
  "caja",
  "secretaria",
  "mecanico",
  "gestor",
  "cliente",
  "inversor",
] as const;
export type Rol = (typeof ROLES)[number];

/** Estados de vehículo (sincronizado con ENUM PG estado_vehiculo) */
export const ESTADOS_VEHICULO = [
  "stock",
  "reservado",
  "vendido",
  "consignacion",
  "preparacion",
  "baja",
] as const;
export type EstadoVehiculo = (typeof ESTADOS_VEHICULO)[number];

export const TIPOS_VEHICULO = [
  "auto",
  "4x4",
  "camioneta",
  "moto",
  "utilitario",
  "otro",
] as const;
export type TipoVehiculo = (typeof TIPOS_VEHICULO)[number];

export const CONDICIONES_VEHICULO = ["0km", "usado"] as const;
export type CondicionVehiculo = (typeof CONDICIONES_VEHICULO)[number];

/** Reservas: tiempo default de expiración (configurable por empresa) */
export const DEFAULT_RESERVA_HORAS = 24 * 7; // 7 días

/** Sucursales seed (override por DB en producción) */
export const SUCURSALES_SEED = [
  { codigo: "AGU", nombre: "Aguilares", provincia: "Tucumán" },
  { codigo: "CON", nombre: "Concepción", provincia: "Tucumán" },
  { codigo: "TUC", nombre: "San Miguel de Tucumán", provincia: "Tucumán" },
] as const;
