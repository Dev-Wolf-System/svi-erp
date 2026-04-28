import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
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
import { formatCuit, formatDni, formatDateTime } from "@repo/utils";
import { getClienteById } from "@/modules/clientes/queries";
import { DeleteButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const c = (await getClienteById(id)) as ClienteDetail | null;
  if (!c) notFound();

  const Icon = c.tipo === "empresa" ? Building2 : User;
  const displayName =
    c.tipo === "empresa"
      ? c.razon_social ?? c.nombre
      : [c.nombre, c.apellido].filter(Boolean).join(" ");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/clientes"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-svi-elevated text-svi-gold">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              CRM · {c.tipo}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
              {displayName || "Sin nombre"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {c.portal_activo && <Badge variant="success">Portal activo</Badge>}
          <Link href={`/clientes/${c.id}/editar`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <DeleteButton id={c.id} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {c.tipo === "empresa" ? (
                <>
                  <Spec label="Razón social" value={c.razon_social} />
                  <Spec label="Nombre comercial" value={c.nombre} />
                  <Spec label="CUIT" value={c.cuit ? formatCuit(c.cuit) : null} mono />
                </>
              ) : (
                <>
                  <Spec label="Nombre" value={c.nombre} />
                  <Spec label="Apellido" value={c.apellido} />
                  <Spec label="DNI" value={c.dni ? formatDni(c.dni) : null} mono />
                  <Spec label="CUIT/CUIL" value={c.cuit ? formatCuit(c.cuit) : null} mono />
                </>
              )}
              <Spec label="Origen" value={c.origen} />
              <Spec label="Alta" value={formatDateTime(c.created_at)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactRow icon={Mail} value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
            <ContactRow
              icon={Phone}
              value={c.celular}
              href={c.celular ? `tel:${c.celular}` : undefined}
              label="Celular"
            />
            <ContactRow
              icon={Phone}
              value={c.telefono}
              href={c.telefono ? `tel:${c.telefono}` : undefined}
              label="Fijo"
            />
            <ContactRow
              icon={MapPin}
              value={[c.direccion, c.localidad, c.provincia].filter(Boolean).join(", ")}
            />
          </CardContent>
        </Card>
      </div>

      {c.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted whitespace-pre-wrap">{c.notas}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Historial de operaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="inline-flex items-center gap-2 text-sm text-svi-muted-2">
              <Calendar className="h-4 w-4 text-svi-gold" />
              El historial unificado (compras + inversiones) se conecta cuando los módulos de Ventas y FCI estén activos (Fases 4-5).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted-2">
              La carga de documentos vinculados al cliente llega cuando se conecte Storage (Fase 4).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Spec({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-svi-muted-2">{label}</dt>
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
        {label && <span className="block text-[10px] uppercase tracking-wider text-svi-muted-2">{label}</span>}
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

interface ClienteDetail {
  id: string;
  tipo: "persona" | "empresa";
  nombre: string;
  apellido: string | null;
  razon_social: string | null;
  dni: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  portal_activo: boolean;
  origen: string | null;
  notas: string | null;
  created_at: string;
}
