import { renderToBuffer } from "@react-pdf/renderer";
import { getSviLogoCircular } from "../assets";
import { generateQrDataUrl } from "../qr";
import { shortHash as shortHashFn } from "../contrato-venta/canonical";
import { computeReciboLiquidacionHash } from "./canonical";
import {
  reciboLiquidacionSchema,
  type ReciboLiquidacionData,
} from "./schema";
import { ReciboLiquidacionDocument } from "./template";

export interface RenderReciboOptions {
  /**
   * Base URL para construir el QR de verificación.
   * Apunta a `<base>/vr/<liquidacion_id>` (página pública).
   */
  verifyBaseUrl?: string;
  /** ID de la liquidación — se usa para construir la URL de verificación. */
  liquidacionId?: string;
  /** Versión del documento. Default 1. */
  contratoVersion?: number;
  /** Si true, incluye el logo SVI en el header. Default true. */
  includeLogo?: boolean;
}

/**
 * Renderiza el recibo de pago de una liquidación a Buffer PDF.
 * Devuelve también el hash canónico para persistir y validar.
 */
export async function renderReciboLiquidacion(
  data: ReciboLiquidacionData,
  options: RenderReciboOptions = {},
): Promise<{ buffer: Buffer; hash: string | null }> {
  const validated = reciboLiquidacionSchema.parse(data);

  const {
    verifyBaseUrl,
    liquidacionId,
    contratoVersion = 1,
    includeLogo = true,
  } = options;

  const logoDataUrl = includeLogo ? await getSviLogoCircular() : null;

  let integrity = null;
  let hashOut: string | null = null;
  if (verifyBaseUrl && liquidacionId) {
    const hash = computeReciboLiquidacionHash(validated);
    const verifyUrl = `${verifyBaseUrl.replace(/\/+$/, "")}/vr/${encodeURIComponent(liquidacionId)}`;
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
    <ReciboLiquidacionDocument
      data={validated}
      logoDataUrl={logoDataUrl}
      integrity={integrity}
    />,
  );

  return { buffer, hash: hashOut };
}
