import type { AfipFacturador } from "./types";
import { AfipStubDriver } from "./stub-driver";

let cachedDriver: AfipFacturador | null = null;

/**
 * Devuelve el driver AFIP configurado por env var `AFIP_DRIVER`.
 *
 *   stub        → AfipStubDriver (default — dev y CI)
 *   sandbox     → AfipSandboxDriver (homologación AFIP, requiere cert sandbox)
 *   production  → AfipProductionDriver (CAE real)
 *
 * El sistema NUNCA debe `new`ear un driver concreto — siempre usar esta factory.
 * Eso permite cambiar de stub→sandbox→production con sólo modificar el env.
 *
 * El resultado se cachea por proceso para preservar el estado del stub
 * (contadores y comprobantes en memoria).
 */
export function getAfipDriver(): AfipFacturador {
  if (cachedDriver) return cachedDriver;

  const driver = process.env.AFIP_DRIVER ?? "stub";

  switch (driver) {
    case "stub":
      cachedDriver = new AfipStubDriver();
      return cachedDriver;

    case "sandbox":
      throw new Error(
        "AFIP sandbox driver no implementado todavía. " +
          "Pendiente: WSAA (token+sign con cert.crt/key) + WSFEv1 (FECAESolicitar). " +
          "Setear AFIP_DRIVER=stub mientras tanto.",
      );

    case "production":
      throw new Error(
        "AFIP production driver no implementado todavía. " +
          "Requiere cert de producción AFIP + alta del punto de venta. " +
          "Setear AFIP_DRIVER=stub o sandbox mientras tanto.",
      );

    default:
      throw new Error(
        `AFIP_DRIVER=${driver} no soportado. Valores válidos: stub | sandbox | production`,
      );
  }
}

/** Solo para tests — resetea la caché entre runs */
export function __resetAfipDriverCache(): void {
  cachedDriver = null;
}
