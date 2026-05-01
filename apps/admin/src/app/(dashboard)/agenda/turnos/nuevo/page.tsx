import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { getRecursos } from "@/modules/agenda/queries";
import { TurnoNuevoForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo turno · Agenda · SVI" };

export default async function NuevoTurnoPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const recursos = await getRecursos({ soloActivos: true });

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <header className="space-y-2">
        <Link
          href="/agenda"
          className="text-xs text-svi-muted-2 hover:text-svi-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" />
          Volver al calendario
        </Link>
        <h1 className="text-3xl font-display tracking-tight text-svi-white">
          Nuevo turno
        </h1>
      </header>

      {recursos.length === 0 ? (
        <p className="text-sm text-svi-muted">
          No hay recursos activos.{" "}
          <Link href="/agenda/recursos/nuevo" className="text-svi-gold underline">
            Creá uno primero
          </Link>
          .
        </p>
      ) : (
        <TurnoNuevoForm recursos={recursos} />
      )}
    </div>
  );
}
