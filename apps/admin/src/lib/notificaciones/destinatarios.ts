import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type DestinatarioAdmin = {
  usuario_id: string;
  empresa_id: string;
  nombre: string;
  telefono: string | null;
  email: string;
};

const ROLES_NOTIFICABLES = ["super_admin", "admin"] as const;

/**
 * Devuelve los usuarios con rol super_admin/admin de las empresas indicadas
 * que pueden recibir notificaciones automáticas (workflow N8N → WhatsApp,
 * email transaccional, etc.).
 *
 * Filtros aplicados:
 *   - usuario activo (`activo = true`, `deleted_at IS NULL`)
 *   - vinculado a un `usuario_sucursal_rol` cuyo rol.nombre ∈ {super_admin, admin}
 *
 * Si `requireWhatsapp=true`, descarta los que no tienen `telefono`.
 *
 * Usa service role: el caller siempre es server-side (cron, webhook handler).
 *
 * Si `empresaIds` está vacío o es null, devuelve los admins de TODAS las
 * empresas activas — usado por el endpoint webhook N8N de liquidación
 * mensual cuando corre en modo system sin scope.
 */
export async function getAdminsNotificables(
  empresaIds: string[] | null | undefined,
  opts?: { requireWhatsapp?: boolean },
): Promise<DestinatarioAdmin[]> {
  const supabase = createServiceClient();

  let q = supabase
    .from("usuario_sucursal_rol")
    .select(
      `
      usuario:usuarios!usuario_sucursal_rol_usuario_id_fkey!inner (
        id, empresa_id, nombre, apellido, email, telefono, activo, deleted_at
      ),
      rol:roles!usuario_sucursal_rol_rol_id_fkey!inner ( nombre )
      `,
    )
    .in("rol.nombre", ROLES_NOTIFICABLES as unknown as string[])
    .eq("usuario.activo", true)
    .is("usuario.deleted_at", null);

  if (empresaIds && empresaIds.length > 0) {
    q = q.in("usuario.empresa_id", empresaIds);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[getAdminsNotificables] error:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const out: DestinatarioAdmin[] = [];

  for (const row of data ?? []) {
    const u = (Array.isArray(row.usuario) ? row.usuario[0] : row.usuario) as
      | {
          id: string;
          empresa_id: string;
          nombre: string;
          apellido: string;
          email: string;
          telefono: string | null;
        }
      | undefined;

    if (!u) continue;
    if (seen.has(u.id)) continue;
    if (opts?.requireWhatsapp && !u.telefono) continue;

    seen.add(u.id);
    out.push({
      usuario_id: u.id,
      empresa_id: u.empresa_id,
      nombre: `${u.nombre} ${u.apellido}`.trim(),
      telefono: u.telefono ?? null,
      email: u.email,
    });
  }

  return out;
}

/**
 * Normaliza un teléfono a formato Evolution API (solo dígitos, código país).
 * Acepta inputs como "+54 9 11 6543-2123", "549116543212" o "11-6543-2123".
 *
 * Si no detecta código de país, asume Argentina (+54).
 * Devuelve null si el resultado tiene < 8 dígitos.
 */
export function normalizarTelefonoWA(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("54")) return digits;
  if (digits.startsWith("0")) return "54" + digits.slice(1);
  return "54" + digits;
}
