// Barrel del módulo AI.
//
// IMPORTANTE: solo se re-exportan tipos y schemas (Zod) desde acá.
// NO re-exportamos los archivos que contienen "use server" (insights.ts,
// categorize.ts, anomalies.ts, forecast.ts, chat.ts, etc.) porque al
// importarlos desde un client component, Next.js 15 mezcla los chunks
// "use server" y rompe el bundle del cliente. Los client components deben
// importar las server actions DIRECTO desde su archivo
// (p.ej. `@/modules/ai/insights`), no desde este barrel.
//
// Ver memoria: feedback_barrel_server_actions.md
export * from "./schemas";
