import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  Percent,
  Coins,
  Calendar,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCurrency, formatDateTime, formatPercent } from "@repo/utils";
import { getBancoById } from "@/modules/bancos/queries";
import { ToggleActivoButton } from "./toggle-activo-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BancoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const b = await getBancoById(id);
  if (!b) notFound();

  const c = b.condiciones ?? {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/bancos"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-svi-elevated text-svi-gold">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              Gestión · banco
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
              {b.nombre}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {b.activo ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="default">Inactivo</Badge>
          )}
          <Link href={`/bancos/${b.id}/editar`}>
            <Button variant="secondary" size="sm">
              Editar
            </Button>
          </Link>
          <ToggleActivoButton id={b.id} activo={b.activo} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactRow icon={User} label="Persona de contacto" value={b.contacto} />
            <ContactRow
              icon={Mail}
              value={b.email}
              href={b.email ? `mailto:${b.email}` : undefined}
            />
            <ContactRow
              icon={Phone}
              value={b.telefono}
              href={b.telefono ? `tel:${b.telefono}` : undefined}
              label="Teléfono"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Condiciones crediticias</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Spec
                label="Tasa mínima"
                value={c.tasa_min != null ? formatPercent(c.tasa_min, 2) : null}
                icon={Percent}
                mono
              />
              <Spec
                label="Tasa máxima"
                value={c.tasa_max != null ? formatPercent(c.tasa_max, 2) : null}
                icon={Percent}
                mono
              />
              <Spec
                label="Cuotas mínimas"
                value={c.cuotas_min != null ? String(c.cuotas_min) : null}
              />
              <Spec
                label="Cuotas máximas"
                value={c.cuotas_max != null ? String(c.cuotas_max) : null}
              />
              <Spec
                label="Monto máximo"
                value={c.monto_max != null ? formatCurrency(c.monto_max, "ARS") : null}
                icon={Coins}
                mono
              />
              <Spec
                label="Última actualización"
                value={formatDateTime(b.updated_at)}
                icon={Calendar}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {c.requisitos && (
        <Card>
          <CardHeader>
            <CardTitle>Requisitos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted whitespace-pre-wrap">{c.requisitos}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Operaciones financiadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-svi-muted-2">
            El historial de ventas financiadas con este banco aparece cuando el módulo
            de Ventas esté activo (Fase 4).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Spec({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  icon?: typeof Mail;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-svi-muted-2 inline-flex items-center gap-1.5">
        {Icon ? <Icon className="h-3 w-3 text-svi-gold" /> : null}
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${value ? "text-svi-white" : "text-svi-disabled"}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
  label,
}: {
  icon: typeof Mail;
  value: string | null;
  href?: string;
  label?: string;
}) {
  if (!value) return null;
  const content = (
    <span className="inline-flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-svi-gold shrink-0" />
      <span>
        {label && (
          <span className="block text-[10px] uppercase tracking-wider text-svi-muted-2">
            {label}
          </span>
        )}
        <span className="text-svi-white">{value}</span>
      </span>
    </span>
  );
  return href ? (
    <a href={href} className="block hover:opacity-80 transition-opacity">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}
