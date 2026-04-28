import { renderToBuffer } from "@react-pdf/renderer";
import { getSviLogoCircular } from "../assets";
import { generateQrDataUrl } from "../qr";
import {
  buildVerifyUrl,
  computeContratoHash,
  shortHash as shortHashFn,
} from "./canonical";
import { contratoVentaSchema, type ContratoVentaData } from "./schema";
import { ContratoVentaDocument } from "./template";

export interface RenderContratoOptions {
  /**
   * Base URL pública para construir la URL de verificación que va al QR.
   * Ej: "https://svi-erp.srv878399.hstgr.cloud" → QR apunta a
   * "<base>/v/<numero_operacion>". Si se omite, el contrato sale SIN
   * sello de integridad (footer legacy) — útil para previews internas.
   */
  verifyBaseUrl?: string;
  /** Versión del documento (cuántas veces se regeneró). Default 1. */
  contratoVersion?: number;
  /** Si true, incluye el logo SVI en el header. Default true. */
  includeLogo?: boolean;
}

/**
 * Renderiza el Contrato de Venta SVI a un Buffer PDF listo para subir
 * a Storage o servir como descarga.
 *
 * Si se pasa `verifyBaseUrl`, agrega el sello de integridad: SHA-256 del
 * payload canónico + QR a la página pública de verificación, impreso en
 * cada página. La página pública recalcula el hash y lo compara con el
 * persistido — anti-tamper sin terceros.
 *
 * Server-only: depende de `node:crypto`, `node:fs` y `node:stream`.
 */
export async function renderContratoVenta(
  data: ContratoVentaData,
  options: RenderContratoOptions = {},
): Promise<{ buffer: Buffer; hash: string | null }> {
  const validated = contratoVentaSchema.parse(data);

  const { verifyBaseUrl, contratoVersion = 1, includeLogo = true } = options;

  const logoDataUrl = includeLogo ? await getSviLogoCircular() : null;

  let integrity = null;
  let hashOut: string | null = null;
  if (verifyBaseUrl) {
    const hash = computeContratoHash(validated);
    const verifyUrl = buildVerifyUrl(verifyBaseUrl, validated.venta.numero_operacion);
    const qrDataUrl = await generateQrDataUrl(verifyUrl);
    integrity = {
      hash,
      shortHash: shortHashFn(hash),
      qrDataUrl,
      verifyUrl,
      contratoVersion,
    };
    hashOut = hash;
  }

  const buffer = await renderToBuffer(
    <ContratoVentaDocument
      data={validated}
      logoDataUrl={logoDataUrl}
      integrity={integrity}
    />,
  );

  return { buffer, hash: hashOut };
}
