// Solo re-exporta lo que es seguro para Client Components.
// Los queries (server-only) y actions se importan con su path completo:
//   import { getVehiculos } from "@/modules/stock/queries"
//   import { createVehiculo } from "@/modules/stock/actions"
export * from "./schemas";
