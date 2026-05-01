import type { Rol } from "@repo/config/constants";

/**
 * Matriz de permisos del sistema (sincronizada con §8.2 del plan).
 * Esto es la "ley", el JWT trae el rol y validamos contra esta tabla.
 *
 * Patrón de uso:
 *   if (!can('stock.delete', user.rol)) throw new Forbidden()
 */
export const PERMISSIONS = {
  "stock.view":           ["super_admin", "admin", "gerente", "vendedor", "secretaria", "mecanico"],
  "stock.create":         ["super_admin", "admin", "gerente", "vendedor"],
  "stock.edit":           ["super_admin", "admin", "gerente", "vendedor"],
  "stock.delete":         ["super_admin", "admin"],
  "stock.transfer":       ["super_admin", "admin", "gerente"],

  "ventas.view":          ["super_admin", "admin", "gerente", "vendedor", "secretaria", "gestor"],
  "ventas.create":        ["super_admin", "admin", "gerente", "vendedor"],
  "ventas.anular":        ["super_admin", "admin"],

  "clientes.view":        ["super_admin", "admin", "gerente", "vendedor", "secretaria", "caja"],
  "clientes.create":      ["super_admin", "admin", "gerente", "vendedor", "secretaria"],
  "clientes.delete":      ["super_admin", "admin"],

  "inversores.view":      ["super_admin", "admin", "gerente"],
  "inversores.create":    ["super_admin", "admin"],
  "inversores.liquidar":  ["super_admin", "admin"],

  "caja.view_propia":     ["super_admin", "admin", "gerente", "caja", "secretaria"],
  "caja.view_global":     ["super_admin", "admin"],
  "caja.registrar":      ["super_admin", "admin", "gerente", "caja"],
  "caja.cerrar":          ["super_admin", "admin", "gerente", "caja"],

  "personal.view":        ["super_admin", "admin", "gerente"],
  "personal.sueldos":    ["super_admin", "admin"],

  "reportes.view":        ["super_admin", "admin", "gerente"],
  "ia.informes":          ["super_admin", "admin", "gerente"],

  "config.view":          ["super_admin", "admin"],
  "config.edit":          ["super_admin"],
  "config.integraciones": ["super_admin"],

  "secretaria.dashboard":   ["super_admin", "admin", "gerente", "secretaria"],
  "agenda.view":            ["super_admin", "admin", "gerente", "vendedor", "secretaria"],
  "agenda.crear_turno":     ["super_admin", "admin", "gerente", "secretaria"],
  "agenda.gestionar_turno": ["super_admin", "admin", "gerente", "secretaria"],
  "leads.assign":           ["super_admin", "admin", "gerente", "secretaria"],

  // ─── IA ───────────────────────────────────────────────────────────────────
  "ia.use":          ["super_admin", "admin", "gerente", "vendedor", "secretaria", "caja"],
  "ia.chat":         ["super_admin", "admin", "gerente", "vendedor", "secretaria", "caja"],
  "ia.report":       ["super_admin", "admin", "gerente"],
  "ia.usage_view":   ["super_admin", "admin"],
  "ia.config":       ["super_admin"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Check de permiso. Retorna true si el rol está autorizado. */
export function can(permission: Permission, rol: Rol | null | undefined): boolean {
  if (!rol) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(rol);
}

/** Variante que lanza si no autoriza — usar en server actions / route handlers */
export function assertCan(permission: Permission, rol: Rol | null | undefined): void {
  if (!can(permission, rol)) {
    throw new Error(`Forbidden: rol "${rol}" no puede ${permission}`);
  }
}
