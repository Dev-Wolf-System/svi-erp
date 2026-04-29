"use server";

import { revalidatePath } from "next/cache";
import {
  renderContratoFci,
  computeContratoFciHash,
  type ContratoFciData,
} from "@repo/pdf/contrato-fci";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const CONTRATOS_BUCKET = "contratos-fci";

/**
 * Renderiza el contrato FCI.
 *
 * Decide automáticamente entre:
 *   - **COPIA**: si los datos legales no cambiaron desde el último ORIGINAL
 *     (mismo hash). Sube con sufijo `-copia-<ts>` y NO toca la DB.
 *   - **ORIGINAL nueva versión**: si los datos cambiaron o no hay hash previo.
 *     Sube como `-vN.pdf` y persiste contrato_url/hash/version.
 *
 * Hash + QR apuntan a `/vi/<numero_contrato>` (página pública).
 */
export async function generarContratoFciPdf(
  inversionId: string,
): Promise<
  ActionResult<{
    signed_url: string;
    tipo: "original" | "copia";
    version: number;
  }>
> {
  const supabase = await createClient();
  const { data: v, error } = await supabase
    .from("inversiones")
    .select(
      `
      id, empresa_id, numero_contrato, fecha_inicio, fecha_vencimiento,
      capital_inicial, moneda, tasa_mensual,
      tipo_instrumento, estado_regulatorio, firma_metodo,
      observaciones,
      contrato_url, contrato_hash, contrato_version,
      inversor:inversores!inversiones_inversor_id_fkey!inner (
        nombre, dni, cuit, email, telefono, banco_nombre, cbu
      ),
      sucursal:sucursales!inversiones_sucursal_id_fkey ( nombre, direccion, telefono, email ),
      empresa:empresas!inversiones_empresa_id_fkey!inner ( nombre, razon_social, cuit )
      `,
    )
    .eq("id", inversionId)
    .single();

  if (error || !v) {
    return { ok: false, error: error?.message ?? "Inversión no encontrada" };
  }

  const inversor = (
    Array.isArray(v.inversor) ? v.inversor[0] : v.inversor
  ) as {
    nombre: string;
    dni: string | null;
    cuit: string | null;
    email: string | null;
    telefono: string | null;
    banco_nombre: string | null;
    cbu: string | null;
  };
  const sucursal = (
    Array.isArray(v.sucursal) ? v.sucursal[0] : v.sucursal
  ) as {
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
  } | null;
  const empresa = (
    Array.isArray(v.empresa) ? v.empresa[0] : v.empresa
  ) as {
    nombre: string;
    razon_social: string | null;
    cuit: string | null;
  };

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

  const data: ContratoFciData = {
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
    inversion: {
      numero_contrato: v.numero_contrato,
      fecha_inicio: v.fecha_inicio,
      fecha_vencimiento: v.fecha_vencimiento ?? null,
      moneda: (v.moneda as "ARS" | "USD") ?? "ARS",
      capital_inicial: Number(v.capital_inicial),
      tasa_mensual_pct: Number(v.tasa_mensual),
      tipo_instrumento: v.tipo_instrumento as ContratoFciData["inversion"]["tipo_instrumento"],
      estado_regulatorio:
        v.estado_regulatorio as ContratoFciData["inversion"]["estado_regulatorio"],
      firma_metodo: v.firma_metodo,
      observaciones: v.observaciones ?? null,
    },
    inversor: {
      nombre: inversor.nombre,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      email: inversor.email ?? null,
      telefono: inversor.telefono ?? null,
      banco_nombre: inversor.banco_nombre ?? null,
      cbu_ultimos4: cbuUltimos4,
    },
  };

  // Decisión copia vs nueva versión por hash canónico
  const hashActual = computeContratoFciHash(data);
  const hashPersistido = (v.contrato_hash as string | null) ?? null;
  const versionPersistida = (v.contrato_version as number | null) ?? 0;
  const esCopia = hashPersistido != null && hashPersistido === hashActual;

  const versionAUsar = esCopia ? versionPersistida : versionPersistida + 1;
  const tipoEjemplar = esCopia ? "COPIA" : "ORIGINAL";
  const ahora = new Date();
  const ahoraIso = ahora.toISOString();

  const verifyBaseUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  const service = createServiceClient();

  let buffer: Buffer;
  let hashFinal: string | null;
  try {
    const out = await renderContratoFci(data, {
      verifyBaseUrl,
      contratoVersion: versionAUsar,
      ejemplar: tipoEjemplar,
      ejemplarFecha: ahoraIso,
    });
    buffer = out.buffer;
    hashFinal = out.hash;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error generando PDF",
    };
  }

  const baseDir = `${v.empresa_id}/${inversionId}`;
  const filePath = esCopia
    ? `${baseDir}/${v.numero_contrato}-v${versionAUsar}-copia-${ahora.getTime()}.pdf`
    : `${baseDir}/${v.numero_contrato}-v${versionAUsar}.pdf`;

  const { error: upErr } = await service.storage
    .from(CONTRATOS_BUCKET)
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) {
    if (upErr.message.includes("Bucket not found")) {
      return {
        ok: false,
        error:
          "Falta crear el bucket privado 'contratos-fci' en Supabase Storage (ver SETUP.md §15).",
      };
    }
    return { ok: false, error: `Storage: ${upErr.message}` };
  }

  const { data: signed, error: signErr } = await service.storage
    .from(CONTRATOS_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (signErr || !signed) {
    return { ok: false, error: `Signed URL: ${signErr?.message ?? "fallida"}` };
  }

  if (!esCopia) {
    await supabase
      .from("inversiones")
      .update({
        contrato_url: filePath,
        contrato_hash: hashFinal,
        contrato_version: versionAUsar,
        updated_at: ahoraIso,
      })
      .eq("id", inversionId);
  }

  revalidatePath(`/inversiones/${inversionId}`);
  return {
    ok: true,
    data: {
      signed_url: signed.signedUrl,
      tipo: esCopia ? "copia" : "original",
      version: versionAUsar,
    },
  };
}

export async function getSignedContratoFciUrl(
  inversionId: string,
): Promise<ActionResult<{ signed_url: string }>> {
  const supabase = await createClient();
  const { data: v, error } = await supabase
    .from("inversiones")
    .select("contrato_url")
    .eq("id", inversionId)
    .single();

  if (error || !v) {
    return { ok: false, error: error?.message ?? "Inversión no encontrada" };
  }
  if (!v.contrato_url) {
    return { ok: false, error: "Esta inversión no tiene contrato generado todavía." };
  }

  const service = createServiceClient();
  const { data: signed, error: signErr } = await service.storage
    .from(CONTRATOS_BUCKET)
    .createSignedUrl(v.contrato_url, 60 * 60);

  if (signErr || !signed) {
    return { ok: false, error: `Signed URL: ${signErr?.message ?? "fallida"}` };
  }

  return { ok: true, data: { signed_url: signed.signedUrl } };
}
