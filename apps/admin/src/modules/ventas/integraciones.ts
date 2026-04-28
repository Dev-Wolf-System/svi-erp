"use server";

import { revalidatePath } from "next/cache";
import {
  getAfipDriver,
  TIPO_COMPROBANTE,
  COND_IVA_RECEPTOR,
  DOC_TIPO,
  type FacturaPayload,
} from "@repo/integrations/afip";
import { createPreference } from "@repo/integrations/mercadopago";
import { renderContratoVenta, type ContratoVentaData } from "@repo/pdf/contrato-venta";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const CONTRATOS_BUCKET = "contratos-pdf";

/**
 * Emite la factura electrónica AFIP para una venta y persiste CAE + datos.
 *
 * Driver intercambiable vía env `AFIP_DRIVER` (stub|sandbox|production).
 * En dev se usa stub: CAE simulado, sin certificado, sin red.
 *
 * Reglas:
 *   - No se permite re-emitir si ya hay CAE (un CAE por venta).
 *   - Tipo de comprobante: B si cliente persona/CF, A si CUIT empresa.
 *   - IVA 21% sobre el precio_final (criterio simplificado MVP).
 *   - Punto de venta default 1 — el real se configura en `empresas.afip_punto_venta`
 *     cuando se active el driver de producción (futuro).
 */
export async function emitirFacturaAfip(
  ventaId: string,
): Promise<ActionResult<{ cae: string }>> {
  const supabase = await createClient();
  const { data: venta, error } = await supabase
    .from("ventas")
    .select(
      `
      id, cae, precio_final, moneda,
      cliente:clientes!inner ( tipo, nombre, apellido, razon_social, cuit, dni )
    `,
    )
    .eq("id", ventaId)
    .single();

  if (error || !venta) return { ok: false, error: "Venta no encontrada" };
  if (venta.cae) return { ok: false, error: "Esta venta ya tiene CAE emitido" };

  const cliente = (
    Array.isArray(venta.cliente) ? venta.cliente[0] : venta.cliente
  ) as {
    tipo: string;
    cuit: string | null;
    dni: string | null;
  };

  const esEmpresaConCuit = cliente.tipo === "empresa" && !!cliente.cuit;
  const docTipo = esEmpresaConCuit
    ? DOC_TIPO.CUIT
    : cliente.dni
      ? DOC_TIPO.DNI
      : DOC_TIPO.CONSUMIDOR_FINAL;
  const docNro =
    esEmpresaConCuit && cliente.cuit
      ? cliente.cuit.replace(/\D/g, "")
      : cliente.dni
        ? cliente.dni.replace(/\D/g, "")
        : "0";

  const total = Number(venta.precio_final);
  const neto = Number((total / 1.21).toFixed(2));
  const iva = Number((total - neto).toFixed(2));

  const payload: FacturaPayload = {
    punto_venta: 1,
    tipo_comprobante: esEmpresaConCuit
      ? TIPO_COMPROBANTE.FACTURA_A
      : TIPO_COMPROBANTE.FACTURA_B,
    doc_tipo: docTipo,
    doc_nro: docNro,
    cond_iva_receptor: esEmpresaConCuit
      ? COND_IVA_RECEPTOR.RESPONSABLE_INSCRIPTO
      : COND_IVA_RECEPTOR.CONSUMIDOR_FINAL,
    fecha_comprobante: new Date().toISOString().slice(0, 10),
    importe_neto: neto,
    importe_iva: iva,
    importe_total: total,
    alicuota_iva: 21,
    moneda: venta.moneda === "USD" ? "DOL" : "PES",
    concepto: 1,
  };

  const driver = getAfipDriver();

  try {
    const cae = await driver.emitirFactura(payload);

    const { error: updErr } = await supabase
      .from("ventas")
      .update({
        afip_driver: driver.driverName,
        cae: cae.cae,
        cae_vencimiento: cae.cae_vencimiento,
        tipo_comprobante: String(payload.tipo_comprobante),
        punto_venta: payload.punto_venta,
        numero_comprobante_afip: String(cae.numero_comprobante).padStart(8, "0"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ventaId);

    if (updErr) return { ok: false, error: `Persistencia CAE: ${updErr.message}` };

    revalidatePath(`/ventas/${ventaId}`);
    return { ok: true, data: { cae: cae.cae } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error AFIP desconocido",
    };
  }
}

/**
 * Crea una preferencia de Mercado Pago para cobrar la seña/anticipo.
 * El monto y el title se calculan a partir de la venta.
 *
 * El webhook de MP (no implementado todavía — Fase 4 cierre) actualizará
 * `mp_payment_id` y `mp_status` cuando llegue la confirmación.
 */
export async function crearPreferenciaMP(
  ventaId: string,
  montoSenia: number,
): Promise<ActionResult<{ init_point: string; preference_id: string }>> {
  const supabase = await createClient();
  const { data: venta, error } = await supabase
    .from("ventas")
    .select(
      `
      id, numero_operacion, sucursal_id, mp_preference_id,
      cliente:clientes!inner ( email, nombre, apellido ),
      vehiculo:vehiculos!inner ( marca, modelo, anio )
    `,
    )
    .eq("id", ventaId)
    .single();

  if (error || !venta) return { ok: false, error: "Venta no encontrada" };
  if (montoSenia <= 0) return { ok: false, error: "Monto debe ser mayor a 0" };

  const cliente = (
    Array.isArray(venta.cliente) ? venta.cliente[0] : venta.cliente
  ) as { email: string | null; nombre: string; apellido: string | null };
  const vehiculo = (
    Array.isArray(venta.vehiculo) ? venta.vehiculo[0] : venta.vehiculo
  ) as { marca: string; modelo: string; anio: number };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const intento = venta.mp_preference_id ? 2 : 1;

  try {
    const pref = await createPreference({
      tipo: "venta_seña",
      referencia_id: venta.id,
      sucursal_id: venta.sucursal_id,
      idempotency_key: `venta_seña-${venta.id}-${intento}`,
      items: [
        {
          id: venta.id,
          title: `Seña ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
          quantity: 1,
          unit_price: montoSenia,
          currency_id: "ARS",
        },
      ],
      payer: cliente.email
        ? {
            email: cliente.email,
            name: cliente.nombre,
            surname: cliente.apellido ?? undefined,
          }
        : undefined,
      back_urls: {
        success: `${baseUrl}/ventas/${ventaId}?mp=success`,
        failure: `${baseUrl}/ventas/${ventaId}?mp=failure`,
        pending: `${baseUrl}/ventas/${ventaId}?mp=pending`,
      },
    });

    await supabase
      .from("ventas")
      .update({
        mp_preference_id: pref.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ventaId);

    revalidatePath(`/ventas/${ventaId}`);
    return {
      ok: true,
      data: { init_point: pref.init_point, preference_id: pref.id },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error MP desconocido",
    };
  }
}

/**
 * Genera el contrato PDF, lo sube al bucket privado `contratos-pdf` con path
 * versionado e inmutable, y persiste `contrato_url` (signed URL temporal).
 *
 * Requiere bucket `contratos-pdf` privado en Supabase Storage.
 */
export async function generarContratoVentaPdf(
  ventaId: string,
): Promise<ActionResult<{ signed_url: string }>> {
  const supabase = await createClient();
  const { data: v, error } = await supabase
    .from("ventas")
    .select(
      `
      id, empresa_id, numero_operacion, created_at,
      precio_venta, descuento, precio_final, moneda, tipo_pago, notas,
      valor_parte, banco_id, legajo_banco, monto_financiado, cuotas, tasa_banco,
      cliente:clientes!inner ( tipo, nombre, apellido, razon_social, cuit, dni, direccion, telefono, email ),
      vehiculo:vehiculos!inner ( marca, modelo, anio, patente, kilometraje, color ),
      vehiculo_parte:vehiculos!ventas_vehiculo_parte_id_fkey ( marca, modelo, anio, patente ),
      banco:bancos ( nombre ),
      sucursal:sucursales!inner ( nombre, direccion ),
      empresa:empresas!inner ( razon_social, cuit, telefono, email )
    `,
    )
    .eq("id", ventaId)
    .single();

  if (error || !v) return { ok: false, error: "Venta no encontrada" };

  const cliente = (Array.isArray(v.cliente) ? v.cliente[0] : v.cliente) as {
    tipo: "persona" | "empresa";
    nombre: string;
    apellido: string | null;
    razon_social: string | null;
    cuit: string | null;
    dni: string | null;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
  };
  const vehiculo = (
    Array.isArray(v.vehiculo) ? v.vehiculo[0] : v.vehiculo
  ) as {
    marca: string;
    modelo: string;
    anio: number;
    patente: string | null;
    kilometraje: number | null;
    color: string | null;
  };
  const sucursal = (
    Array.isArray(v.sucursal) ? v.sucursal[0] : v.sucursal
  ) as { nombre: string; direccion: string | null };
  const empresa = (
    Array.isArray(v.empresa) ? v.empresa[0] : v.empresa
  ) as {
    razon_social: string;
    cuit: string;
    telefono: string | null;
    email: string | null;
  };

  const vehiculoParteRaw = Array.isArray(v.vehiculo_parte)
    ? v.vehiculo_parte[0]
    : v.vehiculo_parte;
  const bancoRaw = Array.isArray(v.banco) ? v.banco[0] : v.banco;

  const documentoTipo: "DNI" | "CUIT" | "CUIL" =
    cliente.tipo === "empresa" ? "CUIT" : cliente.dni ? "DNI" : "CUIT";
  const documentoNumero =
    documentoTipo === "DNI"
      ? cliente.dni!
      : (cliente.cuit ?? cliente.dni ?? "");

  const data: ContratoVentaData = {
    empresa: {
      nombre: "SVI",
      razon_social: empresa.razon_social,
      cuit: empresa.cuit,
      telefono: empresa.telefono,
      email: empresa.email,
    },
    sucursal: {
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
    },
    venta: {
      numero_operacion: v.numero_operacion,
      fecha: v.created_at,
      moneda: (v.moneda as "ARS" | "USD") ?? "ARS",
      precio_venta: Number(v.precio_venta),
      descuento: Number(v.descuento),
      precio_final: Number(v.precio_final),
      tipo_pago: v.tipo_pago as "contado" | "financiado" | "parte_pago",
      notas: v.notas,
    },
    vehiculo: {
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      dominio: vehiculo.patente ?? "—",
      chasis: null,
      motor: null,
      color: vehiculo.color,
      kilometros: vehiculo.kilometraje,
    },
    cliente: {
      tipo: cliente.tipo,
      nombre: cliente.tipo === "empresa" ? cliente.razon_social ?? cliente.nombre : cliente.nombre,
      apellido: cliente.apellido,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      email: cliente.email,
    },
    parte_pago:
      v.tipo_pago === "parte_pago" && vehiculoParteRaw && v.valor_parte != null
        ? {
            marca: (vehiculoParteRaw as { marca: string }).marca,
            modelo: (vehiculoParteRaw as { modelo: string }).modelo,
            anio: (vehiculoParteRaw as { anio: number }).anio,
            dominio: (vehiculoParteRaw as { patente: string | null }).patente ?? "—",
            valor: Number(v.valor_parte),
          }
        : null,
    financiacion:
      v.tipo_pago === "financiado" &&
      bancoRaw &&
      v.monto_financiado != null &&
      v.cuotas != null &&
      v.tasa_banco != null
        ? {
            banco_nombre: (bancoRaw as { nombre: string }).nombre,
            legajo: v.legajo_banco,
            monto_financiado: Number(v.monto_financiado),
            cuotas: v.cuotas,
            tasa_pct: Number(v.tasa_banco),
          }
        : null,
  };

  let buffer: Buffer;
  try {
    buffer = await renderContratoVenta(data);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error generando PDF",
    };
  }

  const service = createServiceClient();
  const versionExistente = await service.storage
    .from(CONTRATOS_BUCKET)
    .list(`${v.empresa_id}/${ventaId}`, { limit: 100 });
  const version = (versionExistente.data?.length ?? 0) + 1;
  const filePath = `${v.empresa_id}/${ventaId}/${v.numero_operacion}-v${version}.pdf`;

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
          "Falta crear el bucket privado 'contratos-pdf' en Supabase Storage (ver SETUP.md).",
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

  await supabase
    .from("ventas")
    .update({
      contrato_url: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ventaId);

  revalidatePath(`/ventas/${ventaId}`);
  return { ok: true, data: { signed_url: signed.signedUrl } };
}
