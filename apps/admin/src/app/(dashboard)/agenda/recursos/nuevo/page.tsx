import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { RecursoNuevoForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo recurso · Agenda · SVI" };

export default async function NuevoRecursoPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <header className="space-y-2">
        <Link
          href="/agenda/recursos"
          className="text-xs text-svi-muted-2 hover:text-svi-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>
        <h1 className="text-3xl font-display tracking-tight text-svi-white">
          Nuevo recurso
        </h1>
        <p className="text-sm text-svi-muted">
          Después de crearlo vas a poder configurar disponibilidad horaria y
          bloqueos puntuales.
        </p>
      </header>

      <RecursoNuevoForm />
    </div>
  );
}
