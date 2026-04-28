import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = resolve(HERE, "../assets/logo-circular.jpg");

let cachedLogo: string | null = null;

/**
 * Devuelve el logo SVI circular como data URL (image/jpeg, base64).
 * Cacheado por proceso — la primera llamada lee el archivo, las siguientes
 * devuelven la cadena cacheada. Pensado para usarse en `<Image src={logo}>`
 * de @react-pdf/renderer.
 *
 * Server-only: lee del filesystem.
 */
export async function getSviLogoCircular(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  const buffer = await readFile(LOGO_PATH);
  cachedLogo = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  return cachedLogo;
}

/** Solo para tests: invalida el cache. */
export function __resetLogoCache(): void {
  cachedLogo = null;
}
