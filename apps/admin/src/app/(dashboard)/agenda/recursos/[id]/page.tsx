import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Ban } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getRecursoById,
  getDisponibilidadDelRecurso,
  getBloqueosDelRecurso,
} from "@/modules/agenda";
import { DisponibilidadSection } from "./disponibilidad-section";
import { BloqueosSection } from "./bloqueos-section";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recurso · Agenda · SVI" };

const DIA_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function RecursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const { id } = await params;
  const recurso = await getRecursoById(id);
  if (!recurso) notFound();

  const [dispos, bloqueos] = await Promise.all([
    getDisponibilidadDelRecurso(id),
    getBloqueosDelRecurso(id),
  ]);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <header className="space-y-2">
        <Link
          href="/agenda/recursos"
          className="text-xs text-svi-muted-2 hover:text-svi-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" />
          Volver a recursos
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="size-12 rounded-lg"
            style={{ backgroundColor: `${recurso.color}1A`, border: `2px solid ${recurso.color}` }}
          />
          <div>
            <h1 className="text-3xl font-display tracking-tight text-svi-white">
              {recurso.nombre}
            </h1>
            <p className="text-sm text-svi-muted-2">
              {recurso.tipo}
              {!recurso.activo && " · Inactivo"}
              {recurso.notas && <> · {recurso.notas}</>}
            </p>
          </div>
        </div>
      </header>

      {/* Disponibilidad recurrente */}
      <section className="rounded-xl border border-svi-border-muted bg-svi-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-svi-gold" />
          <h2 className="text-sm font-mono uppercase tracking-widest text-svi-muted-2">
            Disponibilidad semanal
          </h2>
        </div>

        {dispos.length === 0 ? (
          <p className="text-sm text-svi-muted">
            Sin franjas configuradas. Agregá al menos una para que aparezcan slots disponibles.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dispos.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between p-2 rounded-md bg-svi-elevated text-sm"
              >
                <div>
                  <span className="font-medium text-svi-white">{DIA_LABEL[d.dia_semana]}</span>{" "}
                  <span className="text-svi-muted-2 font-mono">
                    {d.hora_inicio.slice(0, 5)}–{d.hora_fin.slice(0, 5)}
                  </span>{" "}
                  <span className="text-xs text-svi-muted-2">
                    · slots de {d.slot_minutos} min
                  </span>
                </div>
                {/* Botón eliminar inline en sub-componente cliente */}
              </li>
            ))}
          </ul>
        )}

        <DisponibilidadSection recursoId={recurso.id} dispos={dispos} />
      </section>

      {/* Bloqueos */}
      <section className="rounded-xl border border-svi-border-muted bg-svi-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="size-4 text-svi-error" />
          <h2 className="text-sm font-mono uppercase tracking-widest text-svi-muted-2">
            Bloqueos / excepciones
          </h2>
        </div>

        {bloqueos.length === 0 ? (
          <p className="text-sm text-svi-muted">Sin bloqueos puntuales.</p>
        ) : (
          <ul className="space-y-1.5">
            {bloqueos.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between p-2 rounded-md bg-svi-elevated text-sm"
              >
                <div className="text-svi-white">
                  <span className="font-mono text-xs">
                    {fmtRange(b.desde, b.hasta)}
                  </span>
                  {b.motivo && <span className="ml-2 text-svi-muted">— {b.motivo}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <BloqueosSection recursoId={recurso.id} bloqueos={bloqueos} />
      </section>
    </div>
  );
}

function fmtRange(desde: string, hasta: string): string {
  const d = new Date(desde);
  const h = new Date(hasta);
  const fmt = (x: Date) =>
    `${x.toISOString().slice(0, 10)} ${x.getHours().toString().padStart(2, "0")}:${x.getMinutes().toString().padStart(2, "0")}`;
  return `${fmt(d)} → ${fmt(h)}`;
}
