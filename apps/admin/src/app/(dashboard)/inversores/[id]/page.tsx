import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  IdCard,
  Landmark,
  ExternalLink,
  Calendar,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCuit, formatDni, formatDateTime } from "@repo/utils";
import { getInversorById } from "@/modules/inversores/queries";
import { DeleteButton } from "./delete-button";
import { TogglePortalButton } from "./toggle-portal-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface InversorDetail {
  id: string;
  nombre: string;
  cliente_id: string | null;
  dni: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  cbu: string | null;
  alias: string | null;
  banco_nombre: string | null;
  portal_activo: boolean;
  portal_user_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

function ofuscarCbu(cbu: string | null): string {
  if (!cbu) return "—";
  if (cbu.length <= 8) return "*".repeat(cbu.length);
  return `${cbu.slice(0, 4)}${"*".repeat(cbu.length - 8)}${cbu.slice(-4)}`;
}

export default async function InversorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const v = (await getInversorById(id)) as InversorDetail | null;
  if (!v) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/inversores"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              FCI · inversor
            </p>
            <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-svi-white">
              {v.nombre}
            </h1>
            {v.cliente_id && (
              <Link
                href={`/clientes/${v.cliente_id}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-svi-muted-2 hover:text-svi-gold"
              >
                <ExternalLink className="h-3 w-3" />
                Ver ficha de cliente asociada
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TogglePortalButton id={v.id} activo={v.portal_activo} />
          <DeleteButton id={v.id} nombre={v.nombre} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v.cuit ? (
              <p className="flex items-center gap-2 font-mono">
                <IdCard className="h-4 w-4 text-svi-gold" />
                CUIT {formatCuit(v.cuit)}
              </p>
            ) : null}
            {v.dni ? (
              <p className="flex items-center gap-2 font-mono text-svi-muted">
                <IdCard className="h-4 w-4 text-svi-muted-2" />
                DNI {formatDni(v.dni)}
              </p>
            ) : null}
            {!v.cuit && !v.dni && (
              <p className="text-svi-disabled">Sin documento registrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v.email ? (
              <p className="flex items-center gap-2 text-svi-muted">
                <Mail className="h-4 w-4 text-svi-muted-2" />
                <a
                  href={`mailto:${v.email}`}
                  className="hover:text-svi-gold truncate"
                >
                  {v.email}
                </a>
              </p>
            ) : null}
            {v.telefono ? (
              <p className="flex items-center gap-2 text-svi-muted font-mono">
                <Phone className="h-4 w-4 text-svi-muted-2" />
                {v.telefono}
              </p>
            ) : null}
            {!v.email && !v.telefono && (
              <p className="text-svi-disabled">Sin contacto registrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Banco
              {v.cbu && (
                <Badge variant="warning" className="text-[10px]">
                  Datos sensibles
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v.banco_nombre ? (
              <p className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-svi-gold" />
                {v.banco_nombre}
              </p>
            ) : null}
            {v.cbu ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                  CBU
                </p>
                <p className="font-mono text-xs text-svi-white">
                  {ofuscarCbu(v.cbu)}
                </p>
              </div>
            ) : null}
            {v.alias ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                  Alias
                </p>
                <p className="font-mono text-xs text-svi-white">{v.alias}</p>
              </div>
            ) : null}
            {!v.banco_nombre && !v.cbu && !v.alias && (
              <p className="text-svi-disabled">Sin datos bancarios</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal extranet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm">
              {v.portal_activo ? (
                <p className="text-svi-success">
                  ✓ Acceso al portal habilitado
                </p>
              ) : (
                <p className="text-svi-muted-2">Acceso al portal deshabilitado</p>
              )}
              <p className="mt-1 text-xs text-svi-muted-2">
                {v.portal_user_id
                  ? `Vinculado a usuario auth ${v.portal_user_id.slice(0, 8)}…`
                  : "Aún no vinculado a usuario auth — paso pendiente F5.6"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {v.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted whitespace-pre-wrap">{v.notas}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-svi-muted-2 inline-flex items-center gap-1.5">
        <Calendar className="h-3 w-3" />
        Última actualización: {formatDateTime(v.updated_at)}
      </p>
    </div>
  );
}
