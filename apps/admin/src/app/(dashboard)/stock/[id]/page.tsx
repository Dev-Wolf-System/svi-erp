import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Calendar, MapPin } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EstadoVehiculoBadge } from "@repo/ui";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@repo/utils";
import { getVehiculoById } from "@/modules/stock/queries";
import { DeleteButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehiculoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const v = (await getVehiculoById(id)) as VehiculoDetail | null;
  if (!v) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/stock"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              {v.tipo} · {v.condicion === "0km" ? "0 KM" : "Usado"}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
              {v.marca} {v.modelo}
              {v.version && <span className="text-svi-muted-2 font-normal"> · {v.version}</span>}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EstadoVehiculoBadge estado={v.estado} />
          <Link href={`/stock/${v.id}/editar`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <DeleteButton id={v.id} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="relative aspect-[16/9] bg-svi-dark">
            {v.foto_principal_url ? (
              <Image
                src={v.foto_principal_url}
                alt={`${v.marca} ${v.modelo}`}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-svi-muted-2">
                Sin foto principal
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-display text-3xl font-bold text-svi-gold tabular-nums">
              {formatCurrency(v.precio_venta, v.moneda)}
            </p>
            {v.precio_compra && (
              <p className="text-xs text-svi-muted-2">
                Compra: {formatCurrency(v.precio_compra, v.moneda)}
              </p>
            )}
            <div className="pt-3 border-t border-svi-border-muted space-y-2 text-xs text-svi-muted-2">
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-svi-gold" />
                {v.sucursal.nombre} ({v.sucursal.codigo})
              </p>
              <p className="inline-flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-svi-gold" />
                Ingresado {formatDateTime(v.created_at)}
              </p>
              {v.reservado_hasta && (
                <Badge variant="gold">
                  Reservado hasta {formatDate(v.reservado_hasta)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Especificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Spec label="Año" value={String(v.anio)} />
              <Spec label="Patente" value={v.patente} mono />
              <Spec label="VIN" value={v.vin} mono />
              <Spec label="Color" value={v.color} />
              <Spec label="Kilometraje" value={v.kilometraje !== null ? `${formatNumber(v.kilometraje, 0)} km` : null} />
              <Spec label="Combustible" value={v.combustible} />
              <Spec label="Transmisión" value={v.transmision} />
              <Spec label="Motor" value={v.motor} />
              <Spec label="Puertas" value={v.puertas !== null ? String(v.puertas) : null} />
              <Spec label="N° interno" value={v.numero_interno} mono />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de precios</CardTitle>
          </CardHeader>
          <CardContent>
            {!v.precio_historial?.length ? (
              <p className="text-sm text-svi-muted-2">
                Sin cambios registrados todavía.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {v.precio_historial.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-svi-muted-2 text-xs">{formatDate(h.created_at)}</p>
                      {h.motivo && <p className="text-xs text-svi-muted">{h.motivo}</p>}
                    </div>
                    <p className="text-right tabular-nums">
                      <span className="text-svi-muted-2 text-xs">
                        {h.precio_anterior ? formatCurrency(h.precio_anterior, h.moneda) : "—"}
                      </span>
                      <span className="text-svi-gold mx-2">→</span>
                      <span className="text-svi-white font-semibold">
                        {formatCurrency(h.precio_nuevo, h.moneda)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {v.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted whitespace-pre-wrap">{v.observaciones}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Spec({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-svi-muted-2">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono" : ""} ${value ? "text-svi-white" : "text-svi-disabled"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

interface VehiculoDetail {
  id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  patente: string | null;
  vin: string | null;
  numero_interno: string | null;
  tipo: string;
  condicion: string;
  estado: string;
  color: string | null;
  kilometraje: number | null;
  combustible: string | null;
  transmision: string | null;
  motor: string | null;
  puertas: number | null;
  precio_compra: string | null;
  precio_venta: string;
  moneda: "ARS" | "USD";
  foto_principal_url: string | null;
  observaciones: string | null;
  reservado_hasta: string | null;
  created_at: string;
  sucursal: { id: string; nombre: string; codigo: string };
  precio_historial: {
    id: string;
    precio_anterior: string | null;
    precio_nuevo: string;
    moneda: "ARS" | "USD";
    motivo: string | null;
    created_at: string;
  }[];
}
