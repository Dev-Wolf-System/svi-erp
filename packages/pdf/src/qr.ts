import QRCode from "qrcode";

/**
 * Genera un QR como data URL PNG listo para embeber en un `<Image>` de
 * @react-pdf/renderer. Margen mínimo (1 módulo) y nivel de corrección
 * medio — alcanza para URLs cortas a hash truncado.
 */
export async function generateQrDataUrl(
  text: string,
  options: { size?: number; margin?: number } = {},
): Promise<string> {
  const { size = 240, margin = 1 } = options;
  return await QRCode.toDataURL(text, {
    margin,
    width: size,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
}
