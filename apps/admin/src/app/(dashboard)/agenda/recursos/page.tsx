import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowLeft, ChevronRight, UserCog, Users, Building2, Briefcase } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { getRecursos } from "@/modules/agenda/queries";
import type { RecursoTipo } from "@/modules/agenda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recursos · Agenda · SVI" };

const ICON_BY_TIPO: Record<RecursoTipo, typeof UserCog> = {
  owner: UserCog,
  asesor: Briefcase,
  vendedor: Users,
  sala: Building2,
};

const LABEL_BY_TIPO: Record<RecursoTipo, string> = {
  owner: "Owner",
  asesor: "Asesor",
  vendedor: "Vendedor",
  sala: "Sala",
};

export default async function RecursosPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const recursos = await getRecursos();

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <header className="space-y-2">
        <Link
          href="/agenda"
          className="text-xs text-svi-muted-2 hover:text-svi-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" />
          Volver al calendario
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display tracking-tight text-svi-white">
              Recursos de agenda
            </h1>
            <p className="text-sm text-svi-muted">
              Cada recurso tiene su propia disponibilidad horaria y bloqueos.
            </p>
          </div>
          <Link
            href="/agenda/recursos/nuevo"
            className="text-sm px-4 py-2 rounded-lg bg-svi-gold text-svi-black hover:opacity-90 transition inline-flex items-center gap-1.5 font-medium"
          >
            <Plus className="size-4" />
            Nuevo recurso
          </Link>
        </div>
      </header>

      {recursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-svi-border-muted p-10 text-center text-svi-muted">
          No hay recursos cargados todavía.
        </div>
      ) : (
        <ul className="space-y-2">
          {recursos.map((r) => {
            const Icon = ICON_BY_TIPO[r.tipo];
            return (
              <li key={r.id}>
                <Link
                  href={`/agenda/recursos/${r.id}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-svi-border-muted bg-svi-card hover:bg-svi-elevated hover:border-svi-gold/40 transition"
                >
                  <div
                    className="size-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${r.color}1A` }}
                  >
                    <Icon className="size-5" style={{ color: r.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-svi-white">{r.nombre}</p>
                      {!r.activo && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-svi-muted-2 bg-svi-elevated px-1.5 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-svi-muted-2">
                      {LABEL_BY_TIPO[r.tipo]}
                      {r.notas && <> · {r.notas}</>}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-svi-muted-2 group-hover:text-svi-gold transition" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
