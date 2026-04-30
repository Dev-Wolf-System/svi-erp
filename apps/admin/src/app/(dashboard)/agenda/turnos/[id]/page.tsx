import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { Turno } from "@/modules/agenda";
import { TurnoAcciones } from "./acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Turno · Agenda · SVI" };

async function getTurnoDetalle(id: string): Promise<Turno | null> {
  const claims = await getSviClaims();
  if (!claims) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_turnos")
    .select(
      `
      id, empresa_id, recurso_id, persona_tipo, persona_id, externo_nombre,
      externo_telefono, inicio, fin, estado, modalidad, motivo, notas,
      creado_por, external_ref, cancelado_motivo, cancelado_at, cancelado_por,
      created_at,
      recurso:agenda_recursos!agenda_turnos_recurso_id_fkey ( nombre, color )
      `,
    )
    .eq("id", id)
    .eq("empresa_id", claims.empresa_id)
    .maybeSingle();

  if (error || !data) return null;

  type Row = typeof data & {
    recurso?: { nombre: string; color: string } | { nombre: string; color: string }[] | null;
  };
  const r = data as Row;
  const recurso = Array.isArray(r.recurso) ? r.recurso[0] : r.recurso;
  return {
    ...r,
    recurso_nombre: recurso?.nombre ?? null,
    recurso_color: recurso?.color ?? null,
    persona_label: null,
    recurso: undefined,
  } as Turno;
}

export default async function TurnoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");

  const { id } = await params;
  const turno = await getTurnoDetalle(id);
  if (!turno) notFound();

  const inicio = new Date(turno.inicio);
  const fin = new Date(turno.fin);

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
          {turno.motivo}
        </h1>
        <EstadoBadge estado={turno.estado} />
      </header>

      <section className="rounded-xl border border-svi-border-muted bg-svi-card p-5 space-y-4">
        <Field
          icon={Calendar}
          label="Fecha"
          value={inicio.toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
        <Field
          icon={Clock}
          label="Hora"
          value={`${fmt(inicio)} – ${fmt(fin)} (${Math.round((fin.getTime() - inicio.getTime()) / 60000)} min)`}
        />
        <Field
          icon={User}
          label="Persona"
          value={
            turno.persona_tipo === "externo"
              ? turno.externo_nombre ?? "—"
              : `${turno.persona_tipo} · ${turno.persona_id ?? ""}`
          }
        />
        {turno.externo_telefono && (
          <Field icon={Phone} label="Teléfono externo" value={turno.externo_telefono} />
        )}
        <Field
          icon={MapPin}
          label="Modalidad"
          value={turno.modalidad}
          colorBadge={turno.recurso_color ?? undefined}
        />
        <div className="flex items-start gap-3">
          <div
            className="size-4 rounded mt-1.5 shrink-0"
            style={{ backgroundColor: turno.recurso_color ?? "#C5A059" }}
          />
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
              Recurso
            </p>
            <p className="text-svi-white">{turno.recurso_nombre}</p>
          </div>
        </div>

        {turno.notas && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-svi-muted-2 mb-1">
              Notas
            </p>
            <p className="text-svi-muted text-sm whitespace-pre-wrap">{turno.notas}</p>
          </div>
        )}

        {turno.cancelado_motivo && (
          <div className="p-3 rounded-lg bg-svi-error/10 border border-svi-error/30">
            <p className="text-xs font-mono uppercase tracking-wider text-svi-error mb-1">
              Cancelado
            </p>
            <p className="text-sm text-svi-white">{turno.cancelado_motivo}</p>
            <p className="text-xs text-svi-muted-2 mt-1">
              {turno.cancelado_at && new Date(turno.cancelado_at).toLocaleString("es-AR")}
              {turno.cancelado_por && ` · por ${turno.cancelado_por}`}
            </p>
          </div>
        )}

        <p className="text-xs text-svi-muted-2 pt-3 border-t border-svi-border-muted">
          Creado por <span className="font-mono">{turno.creado_por}</span> el{" "}
          {new Date(turno.created_at).toLocaleString("es-AR")}
        </p>
      </section>

      <TurnoAcciones turno={turno} />
    </div>
  );
}

function fmt(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  colorBadge?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-svi-gold shrink-0 mt-1" />
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
          {label}
        </p>
        <p className="text-svi-white capitalize">{value}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Turno["estado"] }) {
  const cls: Record<Turno["estado"], string> = {
    solicitado: "bg-svi-warning/15 text-svi-warning border-svi-warning/40",
    confirmado: "bg-svi-success/15 text-svi-success border-svi-success/40",
    cumplido: "bg-svi-info/15 text-svi-info border-svi-info/40",
    cancelado: "bg-svi-error/15 text-svi-error border-svi-error/40",
    no_show: "bg-svi-error/15 text-svi-error border-svi-error/40",
  };
  return (
    <span
      className={`inline-block text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls[estado]}`}
    >
      {estado.replace("_", " ")}
    </span>
  );
}
