import { renderToBuffer } from "@react-pdf/renderer";
import { getSviLogoCircular } from "../assets";
import { generateQrDataUrl } from "../qr";
import { shortHash as shortHashFn } from "../contrato-venta/canonical";
import { computeContratoFciHash } from "./canonical";
import { contratoFciSchema, type ContratoFciData } from "./schema";
import { ContratoFciDocument } from "./template";

export interface RenderContratoFciOptions {
  /**
   * Base URL pública para construir el URL del QR.
   * Ej: "https://svi-erp.srv878399.hstgr.cloud" → QR apunta a
   * `<base>/vi/<numero_contrato>`. Sin base, no se imprime sello.
   */
  verifyBaseUrl?: string;
  /** Versión del documento (cuántas veces se regeneró). Default 1. */
  contratoVersion?: number;
  /** Si true, incluye el logo SVI en el header. Default true. */
  includeLogo?: boolean;
}

/**
 * Renderiza el Contrato FCI a un Buffer PDF + devuelve el hash canónico.
 * Espejo de `renderContratoVenta`, con URL `/vi/<numero>` para verificación.
 */
export async function renderContratoFci(
  data: ContratoFciData,
  options: RenderContratoFciOptions = {},
): Promise<{ buffer: Buffer; hash: string | null }> {
  const validated = contratoFciSchema.parse(data);

  const { verifyBaseUrl, contratoVersion = 1, includeLogo = true } = options;

  const logoDataUrl = includeLogo ? await getSviLogoCircular() : null;

  let integrity = null;
  let hashOut: string | null = null;
  if (verifyBaseUrl) {
    const hash = computeContratoFciHash(validated);
    const verifyUrl = `${verifyBaseUrl.replace(/\/+$/, "")}/vi/${encodeURIComponent(validated.inversion.numero_contrato)}`;
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
    <ContratoFciDocument
      data={validated}
      logoDataUrl={logoDataUrl}
      integrity={integrity}
    />,
  );

  return { buffer, hash: hashOut };
}
