"use server";

import { revalidatePath } from "next/cache";
import {
  calcularLiquidacionPeriodo,
  primerDiaDelMes,
  redondearMoneda,
  type Moneda,
  type PeriodoYYYYMM,
} from "@repo/utils/calculos-fci";
import {
  renderReciboLiquidacion,
  type ReciboLiquidacionData,
} from "@repo/pdf/recibo-liquidacion";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSviClaims } from "@/lib/auth/claims";
import {
  liquidacionGenerarSchema,
  liquidacionPagarSchema,
  liquidacionAnularSchema,
  type LiquidacionGenerarInput,
  type LiquidacionPagarInput,
  type LiquidacionAnularInput,
} from "./schemas";

const RECIBOS_BUCKET = "recibos-liquidacion";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Genera (o devuelve la existente) la liquidación de un período para una
 * inversión. Idempotente vía external_ref UNIQUE.
 *
 * external_ref = `LIQ-<numero_contrato>-<YYYYMM>` — estable por mes.
 *
 * Reglas:
 *   - La inversión debe existir, estar activa y no borrada.
 *   - El período no puede ser anterior a fecha_inicio.
 *   - Si ya existe, devuelve la existente con flag {ya_existia: true}.
 */
export async function generarLiquidacion(
  input: LiquidacionGenerarInput,
): Promise<
  ActionResult<{ id: string; ya_existia: boolean; monto_interes: number }>
> {
  const parsed = liquidacionGenerarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: inv, error: invErr } = await supabase
    .from("inversiones")
    .select(
      "id, numero_contrato, estado, fecha_inicio, capital_actual, tasa_mensual, moneda",
    )
    .eq("id", parsed.data.inversion_id)
    .is("deleted_at", null)
    .single();
  if (invErr || !inv) return { ok: false, error: "Inversión no encontrada" };

  if (inv.estado !== "activa") {
    return {
      ok: false,
      error: `No se puede liquidar una inversión en estado ${inv.estado}`,
    };
  }

  const periodo: PeriodoYYYYMM = (parsed.data.periodo ??
    primerDiaDelMes(new Date().toISOString())) as PeriodoYYYYMM;

  if (periodo < primerDiaDelMes(inv.fecha_inicio)) {
    return {
      ok: false,
      error: "El período es anterior al inicio del contrato",
    };
  }

  const externalRef = `LIQ-${inv.numero_contrato}-${periodo.slice(0, 7).replace("-", "")}`;

  // Idempotencia: si ya existe, devolverla.
  const { data: existente } = await supabase
    .from("liquidaciones_inversion")
    .select("id, monto_interes")
    .eq("external_ref", externalRef)
    .maybeSingle();

  if (existente) {
    return {
      ok: true,
      data: {
        id: existente.id,
        ya_existia: true,
        monto_interes: Number(existente.monto_interes),
      },
    };
  }

  const liq = calcularLiquidacionPeriodo({
    periodo,
    capital_base: Number(inv.capital_actual),
    tasa_aplicada_pct: Number(inv.tasa_mensual),
    moneda: inv.moneda as Moneda,
  });

  const { data: created, error: insertErr } = await supabase
    .from("liquidaciones_inversion")
    .insert({
      empresa_id: claims.empresa_id,
      inversion_id: inv.id,
      periodo,
      capital_base: liq.capital_base,
      tasa_aplicada: liq.tasa_aplicada_pct,
      monto_interes: liq.monto_interes,
      moneda: liq.moneda,
      estado: "pendiente",
      external_ref: externalRef,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Si llegó la unique violation por carrera (otro request creó la fila
    // entre el SELECT y el INSERT), reintentamos lectura.
    if (insertErr.code === "23505") {
      const { data: again } = await supabase
        .from("liquidaciones_inversion")
        .select("id, monto_interes")
        .eq("external_ref", externalRef)
        .maybeSingle();
      if (again) {
        return {
          ok: true,
          data: {
            id: again.id,
            ya_existia: true,
            monto_interes: Number(again.monto_interes),
          },
        };
      }
    }
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${inv.id}`);
  return {
    ok: true,
    data: {
      id: created.id,
      ya_existia: false,
      monto_interes: liq.monto_interes,
    },
  };
}

/**
 * Genera liquidaciones del mes actual para TODAS las inversiones activas.
 * Idempotente — las que ya existen no se duplican.
 *
 * Devuelve un resumen con creadas/ya_existian/errores. El cron mensual
 * de pg_cron también termina llamando a esta misma lógica.
 */
export async function generarLiquidacionesMesActual(): Promise<
  ActionResult<{ creadas: number; ya_existian: number; errores: string[] }>
> {
  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: invs, error } = await supabase
    .from("inversiones")
    .select("id, numero_contrato")
    .eq("estado", "activa")
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  let creadas = 0;
  let ya_existian = 0;
  const errores: string[] = [];

  for (const inv of invs ?? []) {
    const res = await generarLiquidacion({ inversion_id: inv.id });
    if (!res.ok) {
      errores.push(`${inv.numero_contrato}: ${res.error}`);
    } else if (res.data.ya_existia) {
      ya_existian += 1;
    } else {
      creadas += 1;
    }
  }

  revalidatePath("/liquidaciones");
  return { ok: true, data: { creadas, ya_existian, errores } };
}

/**
 * Marca una liquidación como pagada. Aplica la decisión del inversor:
 *
 *   - retirar: el monto se entrega al inversor (default).
 *   - reinvertir: se suma al capital_actual de la inversión.
 *
 * Genera el recibo PDF con sello hash + QR y lo persiste en
 * `liquidaciones_inversion.recibo_url/hash/version`.
 *
 * Requiere bucket privado `recibos-liquidacion` en Supabase Storage
 * (ver SETUP.md §16).
 */
export async function pagarLiquidacion(
  input: LiquidacionPagarInput,
): Promise<
  ActionResult<{
    id: string;
    modo_pago_inversor: "retirar" | "reinvertir";
    capital_actual_post: number;
    recibo_signed_url: string | null;
  }>
> {
  const parsed = liquidacionPagarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();

  const { data: liq, error: fetchErr } = await supabase
    .from("liquidaciones_inversion")
    .select(
      `
      id, empresa_id, inversion_id, estado, periodo, moneda,
      capital_base, tasa_aplicada, monto_interes,
      inversion:inversiones!liquidaciones_inversion_inversion_id_fkey!inner (
        numero_contrato, capital_actual,
        inversor:inversores!inversiones_inversor_id_fkey!inner (
          nombre, dni, cuit, banco_nombre, cbu
        ),
        sucursal:sucursales!inversiones_sucursal_id_fkey ( nombre, direccion, telefono, email ),
        empresa:empresas!inversiones_empresa_id_fkey!inner ( nombre, razon_social, cuit )
      )
      `,
    )
    .eq("id", parsed.data.id)
    .single();

  if (fetchErr || !liq) return { ok: false, error: "Liquidación no encontrada" };

  if (liq.estado !== "pendiente") {
    return {
      ok: false,
      error: `Solo se pueden pagar liquidaciones pendientes (estado actual: ${liq.estado})`,
    };
  }

  const inversionRow = (
    Array.isArray(liq.inversion) ? liq.inversion[0] : liq.inversion
  ) as {
    numero_contrato: string;
    capital_actual: string;
    inversor:
      | {
          nombre: string;
          dni: string | null;
          cuit: string | null;
          banco_nombre: string | null;
          cbu: string | null;
        }
      | Array<{
          nombre: string;
          dni: string | null;
          cuit: string | null;
          banco_nombre: string | null;
          cbu: string | null;
        }>;
    sucursal:
      | {
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          email: string | null;
        }
      | Array<{
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          email: string | null;
        }>
      | null;
    empresa:
      | {
          nombre: string;
          razon_social: string | null;
          cuit: string | null;
        }
      | Array<{
          nombre: string;
          razon_social: string | null;
          cuit: string | null;
        }>;
  };

  const inversor = (
    Array.isArray(inversionRow.inversor)
      ? inversionRow.inversor[0]
      : inversionRow.inversor
  )!;
  const sucursal = inversionRow.sucursal
    ? Array.isArray(inversionRow.sucursal)
      ? inversionRow.sucursal[0]!
      : inversionRow.sucursal
    : null;
  const empresa = (
    Array.isArray(inversionRow.empresa)
      ? inversionRow.empresa[0]
      : inversionRow.empresa
  )!;

  const ahora = new Date();
  const ahoraIso = ahora.toISOString();
  const fechaPago = parsed.data.fecha_pago ?? ahoraIso.slice(0, 10);
  const comprobanteRef =
    parsed.data.comprobante_url && parsed.data.comprobante_url !== ""
      ? parsed.data.comprobante_url
      : null;

  const monto = Number(liq.monto_interes);
  const capitalAnterior = Number(inversionRow.capital_actual);
  const esReinversion = parsed.data.modo_pago_inversor === "reinvertir";
  const capitalPost = esReinversion
    ? redondearMoneda(capitalAnterior + monto)
    : capitalAnterior;

  // 1. UPDATE liquidación → pagada
  const { error: updErr } = await supabase
    .from("liquidaciones_inversion")
    .update({
      estado: "pagada",
      fecha_pago: ahoraIso,
      metodo_pago: parsed.data.metodo_pago,
      modo_pago_inversor: parsed.data.modo_pago_inversor,
      comprobante_url: comprobanteRef,
      updated_at: ahoraIso,
    })
    .eq("id", parsed.data.id);
  if (updErr) return { ok: false, error: updErr.message };

  // 2. Si es reinversión, sumar al capital_actual
  if (esReinversion) {
    const { error: invErr } = await supabase
      .from("inversiones")
      .update({
        capital_actual: capitalPost,
        updated_at: ahoraIso,
      })
      .eq("id", liq.inversion_id);
    if (invErr) return { ok: false, error: `Reinvertir: ${invErr.message}` };
  }

  // 3. Generar recibo PDF
  const documentoTipo: "DNI" | "CUIT" | "CUIL" = inversor.cuit
    ? "CUIT"
    : "DNI";
  const documentoNumero =
    documentoTipo === "CUIT"
      ? (inversor.cuit ?? "")
      : (inversor.dni ?? inversor.cuit ?? "");
  const cbuUltimos4 =
    inversor.cbu && inversor.cbu.length >= 4
      ? inversor.cbu.slice(-4)
      : null;

  const reciboData: ReciboLiquidacionData = {
    empresa: {
      nombre: empresa.nombre,
      razon_social: empresa.razon_social ?? empresa.nombre,
      cuit: empresa.cuit ?? "",
      telefono: sucursal?.telefono ?? null,
      email: sucursal?.email ?? null,
    },
    sucursal: {
      nombre: sucursal?.nombre ?? "—",
      direccion: sucursal?.direccion ?? null,
    },
    inversor: {
      nombre: inversor.nombre,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      banco_nombre: inversor.banco_nombre ?? null,
      cbu_ultimos4: cbuUltimos4,
    },
    inversion: {
      numero_contrato: inversionRow.numero_contrato,
      moneda: (liq.moneda as "ARS" | "USD") ?? "ARS",
    },
    liquidacion: {
      periodo: liq.periodo,
      capital_base: Number(liq.capital_base),
      tasa_aplicada_pct: Number(liq.tasa_aplicada),
      monto_interes: monto,
      fecha_pago: fechaPago,
      metodo_pago:
        parsed.data.metodo_pago as ReciboLiquidacionData["liquidacion"]["metodo_pago"],
      comprobante_referencia: comprobanteRef,
      modo_pago_inversor: parsed.data.modo_pago_inversor,
      capital_actual_post: capitalPost,
    },
  };

  const verifyBaseUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  const service = createServiceClient();

  let reciboSignedUrl: string | null = null;
  try {
    const { buffer, hash } = await renderReciboLiquidacion(reciboData, {
      verifyBaseUrl,
      liquidacionId: liq.id,
      contratoVersion: 1,
    });

    const filePath = `${liq.empresa_id}/${liq.inversion_id}/${liq.id}.pdf`;
    const { error: upErr } = await service.storage
      .from(RECIBOS_BUCKET)
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr && !upErr.message.includes("Bucket not found")) {
      // Falla del bucket no debe revertir el pago — recibo se puede regenerar.
      // Loguear y seguir; el operador verá ausencia del recibo en UI y puede reintentar.
      console.error("[pagarLiquidacion] Error subiendo recibo:", upErr.message);
    } else if (!upErr) {
      const { data: signed } = await service.storage
        .from(RECIBOS_BUCKET)
        .createSignedUrl(filePath, 60 * 60);
      reciboSignedUrl = signed?.signedUrl ?? null;

      await supabase
        .from("liquidaciones_inversion")
        .update({
          recibo_url: filePath,
          recibo_hash: hash,
          recibo_version: 1,
          updated_at: ahoraIso,
        })
        .eq("id", liq.id);
    } else {
      console.error(
        "[pagarLiquidacion] Bucket recibos-liquidacion no existe — crear según SETUP.md §16",
      );
    }
  } catch (err) {
    console.error(
      "[pagarLiquidacion] Error generando recibo:",
      err instanceof Error ? err.message : err,
    );
  }

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${liq.inversion_id}`);
  return {
    ok: true,
    data: {
      id: parsed.data.id,
      modo_pago_inversor: parsed.data.modo_pago_inversor,
      capital_actual_post: capitalPost,
      recibo_signed_url: reciboSignedUrl,
    },
  };
}

/**
 * Devuelve una signed URL fresca (1h) del recibo PDF previamente generado.
 */
export async function getSignedReciboUrl(
  liquidacionId: string,
): Promise<ActionResult<{ signed_url: string }>> {
  const supabase = await createClient();
  const { data: liq, error } = await supabase
    .from("liquidaciones_inversion")
    .select("recibo_url")
    .eq("id", liquidacionId)
    .single();

  if (error || !liq) return { ok: false, error: "Liquidación no encontrada" };
  if (!liq.recibo_url)
    return { ok: false, error: "Esta liquidación no tiene recibo generado." };

  const service = createServiceClient();
  const { data: signed, error: signErr } = await service.storage
    .from(RECIBOS_BUCKET)
    .createSignedUrl(liq.recibo_url, 60 * 60);

  if (signErr || !signed)
    return { ok: false, error: `Signed URL: ${signErr?.message ?? "fallida"}` };

  return { ok: true, data: { signed_url: signed.signedUrl } };
}

export async function anularLiquidacion(
  input: LiquidacionAnularInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = liquidacionAnularSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Motivo requerido (mínimo 3 caracteres)" };

  const supabase = await createClient();

  const { data: liq, error: fetchErr } = await supabase
    .from("liquidaciones_inversion")
    .select("estado, inversion_id")
    .eq("id", parsed.data.id)
    .single();
  if (fetchErr || !liq) return { ok: false, error: "Liquidación no encontrada" };

  if (liq.estado === "pagada") {
    return {
      ok: false,
      error: "No se puede anular una liquidación pagada — generar reverso manual",
    };
  }
  if (liq.estado === "anulada") {
    return { ok: false, error: "Ya estaba anulada" };
  }

  const { error } = await supabase
    .from("liquidaciones_inversion")
    .update({
      estado: "anulada",
      motivo_anulacion: parsed.data.motivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/liquidaciones");
  revalidatePath(`/inversiones/${liq.inversion_id}`);
  return { ok: true, data: { id: parsed.data.id } };
}
