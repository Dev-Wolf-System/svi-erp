import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";

export interface LogEventInput {
  /** Tabla afectada por el evento (ej: 'movimientos_caja', 'cierres_caja'). */
  tabla:           string;
  /** UUID de la fila afectada. NULL solo si el evento es de sistema sin registro. */
  registroId:      string | null;
  /** Acción semántica: 'anular_con_motivo' | 'exportar' | 'imprimir' | 'login' | etc. */
  action:          string;
  /** Metadata adicional (motivo, ip, ua, etc.). El helper SQL mergea `action` adentro. */
  metadata?:       Record<string, unknown>;
  /** Snapshot previo si aplica (para acciones que mutan estado). */
  datosAnteriores?: unknown;
  /** Snapshot posterior si aplica. */
  datosNuevos?:     unknown;
}

/**
 * Registra un evento semántico en `audit_log` vía `fn_audit_log_event()`.
 *
 * Cuándo USARLO:
 *   - Acciones que NO son CRUD básico: anular_con_motivo, exportar PDF/Excel,
 *     imprimir, login, logout, cambio de permisos, etc.
 *
 * Cuándo NO usarlo:
 *   - INSERT/UPDATE/DELETE simples → el trigger genérico `trg_audit_log` ya los
 *     captura automáticamente. Llamar a `logEvent` adicional sería redundante.
 *
 * Garantías:
 *   - Fail-open: si el log falla (RPC error, sin sesión, etc.) NO rompe la
 *     operación principal. El audit es secundario al business action.
 *   - SECURITY DEFINER en `fn_audit_log_event` bypassea la RLS de audit_log.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const claims = await getSviClaims();
    if (!claims) return;
    const supabase = await createClient();
    await supabase.rpc("fn_audit_log_event", {
      p_empresa_id:       claims.empresa_id,
      p_user_id:          claims.sub,
      p_tabla:            input.tabla,
      p_registro_id:      input.registroId,
      p_action:           input.action,
      p_metadata:         input.metadata ?? null,
      p_datos_anteriores: input.datosAnteriores ?? null,
      p_datos_nuevos:     input.datosNuevos ?? null,
    });
  } catch {
    /* fail-open intencional: el audit no debe romper la operación principal */
  }
}
