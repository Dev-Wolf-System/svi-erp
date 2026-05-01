import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { getRecursos } from "@/modules/agenda/queries";
import type { PersonaTipo } from "@/modules/agenda";
import { TurnoNuevoForm } from "./form";
import { getPersonaLabel } from "./search-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo turno · Agenda · SVI" };

const PERSONA_TIPOS_VALIDOS: PersonaTipo[] = ["cliente", "inversor", "lead", "externo"];

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: Promise<{ persona_id?: string; persona_tipo?: string }>;
}) {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const [params, recursos] = await Promise.all([
    searchParams,
    getRecursos({ soloActivos: true }),
  ]);

  const rawTipo = params.persona_tipo ?? "externo";
  const initialPersonaTipo: PersonaTipo = PERSONA_TIPOS_VALIDOS.includes(
    rawTipo as PersonaTipo,
  )
    ? (rawTipo as PersonaTipo)
    : "externo";
  const initialPersonaId = params.persona_id ?? "";

  const initialPersonaLabel =
    initialPersonaId && initialPersonaTipo !== "externo"
      ? ((await getPersonaLabel(initialPersonaTipo, initialPersonaId)) ?? "")
      : "";

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
        <TurnoNuevoForm
          recursos={recursos}
          initialPersonaId={initialPersonaId}
          initialPersonaTipo={initialPersonaTipo}
          initialPersonaLabel={initialPersonaLabel}
        />
      )}
    </div>
  );
}
