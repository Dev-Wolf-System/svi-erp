// Solo re-exporta lo que es seguro para Client Components.
// Queries (server-only) y actions se importan con su path completo:
//   import { getClientes } from "@/modules/clientes/queries"
//   import { createCliente } from "@/modules/clientes/actions"
export * from "./schemas";
