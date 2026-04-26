import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — apunta a Supabase Postgres.
 * El schema es la fuente de verdad; las migraciones SQL en supabase/migrations/
 * se generan con `npm run db:generate -w @repo/database` y se revisan a mano.
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "../../supabase/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
  schemaFilter: ["public"],
});
