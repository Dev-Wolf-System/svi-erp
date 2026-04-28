import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart, Calendar, User, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { formatCurrency, formatDateTime, formatPercent } from "@repo/utils";
import { getVentaById } from "@/modules/ventas/queries";
import {
  LABEL_ESTADO,
  COLOR_ESTADO,
  LABEL_TIPO_PAGO,
  type EstadoVenta,
  type TipoPago,
} from "@/modules/ventas/schemas";
import { CambiarEstadoSelect } from "./cambiar-estado";
import { AccionesCard } from "./acciones-card";
import { AnularButton } from "./anular-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface VentaDetail {
  id: string;
  numero_operacion: string;
  estado: EstadoVenta;
  tipo_pago: TipoPago;
  precio_venta: string;
  descuento: string;
  precio_final: string;
  moneda: string;
  comision_pct: string | null;
  comision_monto: string | null;
  cae: string | null;
  cae_vencimiento: string | null;
  tipo_comprobante: string | null;
  punto_venta: number | null;
  numero_comprobante_afip: string | null;
  afip_driver: string | null;
  comprobante_afip_url: string | null;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_init_point: string | null;
  contrato_url: string | null;
  legajo_banco: string | null;
  monto_financiado: string | null;
  cuotas: number | null;
  tasa_banco: string | null;
  valor_parte: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  vehiculo: {
    id: string;
    marca: string;
    modelo: string;
    version: string | null;
    anio: number;
    patente: string | null;
    color: string | null;
    kilometraje: number | null;
    foto_principal_url: string | null;
  };
  cliente: {
    id: string;
    tipo: "persona" | "empresa";
    nombre: string;
    apellido: string | null;
    razon_social: string | null;
    email: string | null;
    telefono: string | null;
    cuit: string | null;
    dni: string | null;
  };
  sucursal: { id: string; nombre: string; codigo: string };
  vehiculo_parte: {
    marca: string;
    modelo: string;
    anio: number;
    patente: string | null;
  } | null;
  banco: { id: string; nombre: string } | null;
}

export default async function VentaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const v = (await getVentaById(id)) as VentaDetail | null;
  if (!v) notFound();

  const cliente =
    v.cliente.tipo === "empresa"
      ? v.cliente.razon_social ?? v.cliente.nombre
      : [v.cliente.apellido, v.cliente.nombre].filter(Boolean).join(", ");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/ventas"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-svi-elevated text-svi-gold">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              {v.numero_operacion} · {v.sucursal.nombre}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
              {v.vehiculo.marca} {v.vehiculo.modelo}{" "}
              <span className="text-svi-muted-2">{v.vehiculo.anio}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-mono uppercase ${COLOR_ESTADO[v.estado]}`}
          >
            {LABEL_ESTADO[v.estado]}
          </span>
          {v.estado !== "anulado" && (
            <CambiarEstadoSelect id={v.id} estadoActual={v.estado} />
          )}
          {v.estado !== "anulado" && !v.cae && <AnularButton id={v.id} />}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen económico</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Spec
                label="Precio de lista"
                value={formatCurrency(Number(v.precio_venta), v.moneda as "ARS" | "USD")}
                mono
              />
              <Spec
                label="Descuento"
                value={
                  Number(v.descuento) > 0
                    ? `- ${formatCurrency(Number(v.descuento), v.moneda as "ARS" | "USD")}`
                    : "—"
                }
                mono
              />
              <Spec
                label="Precio final"
                value={formatCurrency(Number(v.precio_final), v.moneda as "ARS" | "USD")}
                mono
                highlight
              />
              <Spec label="Modalidad" value={LABEL_TIPO_PAGO[v.tipo_pago]} />
              <Spec
                label="Comisión"
                value={
                  v.comision_pct != null
                    ? `${formatPercent(Number(v.comision_pct), 2)} · ${formatCurrency(Number(v.comision_monto ?? 0), v.moneda as "ARS" | "USD")}`
                    : "—"
                }
                mono
              />
              <Spec label="Alta" value={formatDateTime(v.created_at)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-svi-gold" />
              <Link
                href={`/clientes/${v.cliente.id}`}
                className="text-svi-white hover:text-svi-gold"
              >
                {cliente || "—"}
              </Link>
            </div>
            {v.cliente.cuit && (
              <p className="font-mono text-xs text-svi-muted">
                CUIT {v.cliente.cuit}
              </p>
            )}
            {v.cliente.dni && (
              <p className="font-mono text-xs text-svi-muted">
                DNI {v.cliente.dni}
              </p>
            )}
            {v.cliente.email && (
              <p className="text-xs text-svi-muted">{v.cliente.email}</p>
            )}
            {v.cliente.telefono && (
              <p className="text-xs text-svi-muted font-mono">{v.cliente.telefono}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Vehículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 mt-0.5 text-svi-gold" />
              <Link
                href={`/stock/${v.vehiculo.id}`}
                className="text-svi-white hover:text-svi-gold"
              >
                {v.vehiculo.marca} {v.vehiculo.modelo}
                {v.vehiculo.version && ` ${v.vehiculo.version}`}
              </Link>
            </div>
            <p className="text-xs text-svi-muted">
              Año {v.vehiculo.anio} · {v.vehiculo.color ?? "color s/d"}
            </p>
            {v.vehiculo.patente && (
              <p className="font-mono text-xs text-svi-muted">
                Dominio {v.vehiculo.patente}
              </p>
            )}
            {v.vehiculo.kilometraje != null && (
              <p className="text-xs text-svi-muted">
                {new Intl.NumberFormat("es-AR").format(v.vehiculo.kilometraje)} km
              </p>
            )}
          </CardContent>
        </Card>

        {v.vehiculo_parte && (
          <Card>
            <CardHeader>
              <CardTitle>Parte de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-svi-white">
                {v.vehiculo_parte.marca} {v.vehiculo_parte.modelo}
              </p>
              <p className="text-xs text-svi-muted">
                Año {v.vehiculo_parte.anio}
                {v.vehiculo_parte.patente && ` · ${v.vehiculo_parte.patente}`}
              </p>
              {v.valor_parte && (
                <p className="font-mono text-svi-gold">
                  {formatCurrency(Number(v.valor_parte), v.moneda as "ARS" | "USD")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {v.banco && (
          <Card>
            <CardHeader>
              <CardTitle>Financiación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link
                href={`/bancos/${v.banco.id}`}
                className="text-svi-white hover:text-svi-gold"
              >
                {v.banco.nombre}
              </Link>
              {v.legajo_banco && (
                <p className="font-mono text-xs text-svi-muted">
                  Legajo {v.legajo_banco}
                </p>
              )}
              {v.monto_financiado && (
                <p className="font-mono text-svi-gold">
                  {formatCurrency(Number(v.monto_financiado), v.moneda as "ARS" | "USD")}
                </p>
              )}
              <p className="text-xs text-svi-muted">
                {v.cuotas} cuotas · TNA {v.tasa_banco}%
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AccionesCard
        ventaId={v.id}
        cae={v.cae}
        caeVencimiento={v.cae_vencimiento}
        afipDriver={v.afip_driver}
        comprobanteAfipUrl={v.comprobante_afip_url}
        mpPreferenceId={v.mp_preference_id}
        mpPaymentId={v.mp_payment_id}
        mpStatus={v.mp_status}
        mpInitPoint={v.mp_init_point}
        contratoPath={v.contrato_url}
        precioFinal={Number(v.precio_final)}
        moneda={v.moneda}
      />

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

function Spec({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-svi-muted-2">{label}</dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${highlight ? "text-svi-gold text-lg font-bold" : "text-svi-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}
