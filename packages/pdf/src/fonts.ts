import { Font } from "@react-pdf/renderer";

/**
 * Registra las familias tipográficas SVI (Montserrat + DM Sans) leyéndolas
 * desde un directorio local. Llamar UNA SOLA VEZ al boot del proceso server.
 *
 * NUNCA registrar fuentes con URLs remotas en runtime:
 *   - Cold start +1-3s en cada generación.
 *   - Si Google Fonts está caído, la generación falla.
 *   - En contenedores aislados rompe siempre.
 *
 * Uso (Server Action o instrumentation.ts de Next):
 *   import path from "node:path";
 *   import { registerSviFonts } from "@repo/pdf/fonts";
 *   registerSviFonts(path.join(process.cwd(), "fonts"));
 *
 * Si NO se llama, el template cae a Helvetica (PDF standard built-in)
 * y los `fontFamily` quedan ignorados. La salida sigue siendo válida.
 */
export function registerSviFonts(fontsDir: string): void {
  if (registered) return;

  Font.register({
    family: "Montserrat",
    fonts: [
      { src: `${fontsDir}/Montserrat-Regular.ttf` },
      { src: `${fontsDir}/Montserrat-SemiBold.ttf`, fontWeight: 600 },
      { src: `${fontsDir}/Montserrat-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  Font.register({
    family: "DMSans",
    fonts: [
      { src: `${fontsDir}/DMSans-Regular.ttf` },
      { src: `${fontsDir}/DMSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  registered = true;
}

let registered = false;

/** Solo para tests — permite re-registrar entre runs. */
export function __resetFontsRegistered(): void {
  registered = false;
}

export function areSviFontsRegistered(): boolean {
  return registered;
}
