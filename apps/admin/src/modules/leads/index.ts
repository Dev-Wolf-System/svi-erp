// Solo exporta lo que es seguro para Client Components.
// Queries (server-only) y actions con su path completo:
//   import { getLeads } from "@/modules/leads/queries"
//   import { updateLeadEstado } from "@/modules/leads/actions"
export * from "./schemas";
