import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  User,
  History,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
} from "@repo/utils";
import {
  getInversionById,
  getTasaHistorial,
  getAportesPorInversion,
} from "@/modules/inversiones/queries";
import { getLiquidacionesPorInversion } from "@/modules/liquidaciones-inversion/queries";
import { LiquidacionesInversionPanel } from "./liquidaciones-panel";
import { AportesPanel } from "./aportes-panel";
import {
  LABEL_ESTADO,
  LABEL_TIPO_INSTRUMENTO,
  LABEL_REGULATORIO,
  COLOR_ESTADO,
  COLOR_REGULATORIO,
  type EstadoInversion,
  type EstadoRegulatorio,
  type TipoInstrumento,
} from "@/modules/inversiones/schemas";
import { CambiarTasaButton } from "./cambiar-tasa-button";
import { CambiarEstadoButton } from "./cambiar-estado-button";
import { DeleteButton } from "./delete-button";
import { ContratoFciCard } from "./contrato-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface InversionDetail {
  id: string;
  numero_contrato: string;
  estado: EstadoInversion;
  tipo_instrumento: TipoInstrumento;
  estado_regulatorio: EstadoRegulatorio;
  firma_metodo: string;
  capital_inicial: string;
  capital_actual: string;
  moneda: string;
  tasa_mensual: string;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  contrato_url: string | null;
  contrato_hash: string | null;
  contrato_version: number;
  created_at: string;
  updated_at: string;
  inversor: {
    id: string;
    nombre: string;
    dni: string | null;
    cuit: string | null;
    email: string | null;
    telefono: string | null;
    banco_nombre: string | null;
  };
  sucursal: {
    id: string;
    nombre: string;
    codigo: string;
    direccion: string | null;
  } | null;
}

export default async function InversionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const v = (await getInversionById(id)) as InversionDetail | null;
  if (!v) notFound();

  const [historial, liquidaciones, aportes] = await Promise.all([
    getTasaHistorial(id),
    getLiquidacionesPorInversion(id),
    getAportesPorInversion(id),
  ]);
  const moneda = v.moneda as "ARS" | "USD";

  const meses = mesesEntre(v.fecha_inicio, new Date().toISOString().slice(0, 10));
  const interesAcumuladoEstimado =
    Number(v.capital_actual) * (Number(v.tasa_mensual) / 100) * Math.max(0, meses);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/inversiones"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-svi-elevated text-svi-gold">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
              {v.numero_contrato}
              {v.sucursal && ` · ${v.sucursal.nombre}`}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
              {v.inversor.nombre}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-mono uppercase ${COLOR_ESTADO[v.estado]}`}
          >
            {LABEL_ESTADO[v.estado]}
          </span>
          <CambiarEstadoButton id={v.id} estadoActual={v.estado} />
          {v.estado !== "finalizada" && historial.length === 0 && (
            <DeleteButton id={v.id} />
          )}
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
                label="Capital actual"
                value={formatCurrency(Number(v.capital_actual), moneda)}
                mono
                highlight
              />
              <Spec
                label="Capital inicial"
                value={formatCurrency(Number(v.capital_inicial), moneda)}
                mono
              />
              <Spec
                label="Tasa mensual"
                value={formatPercent(Number(v.tasa_mensual), 2)}
                mono
              />
              <Spec
                label="Fecha inicio"
                value={formatDate(v.fecha_inicio)}
              />
              <Spec
                label="Vencimiento"
                value={
                  v.fecha_vencimiento ? formatDate(v.fecha_vencimiento) : "Sin plazo"
                }
              />
              <Spec
                label="Meses transcurridos"
                value={String(Math.max(0, meses))}
                mono
              />
              <Spec
                label="Interés estimado acum."
                value={formatCurrency(interesAcumuladoEstimado, moneda)}
                mono
                hint="Estimación lineal — el detalle real surge de las liquidaciones del módulo (F5.3)."
              />
              <Spec
                label="Instrumento"
                value={LABEL_TIPO_INSTRUMENTO[v.tipo_instrumento]}
              />
              <Spec label="Firma" value={v.firma_metodo} />
            </dl>
            <div className="mt-4 pt-4 border-t border-svi-border-muted/50 flex items-center gap-2">
              <span className="text-xs text-svi-muted-2">Régimen legal:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_REGULATORIO[v.estado_regulatorio]}`}
              >
                {LABEL_REGULATORIO[v.estado_regulatorio]}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inversor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-svi-gold" />
              <Link
                href={`/inversores/${v.inversor.id}`}
                className="text-svi-white hover:text-svi-gold"
              >
                {v.inversor.nombre}
              </Link>
            </div>
            {v.inversor.cuit && (
              <p className="font-mono text-xs text-svi-muted">
                CUIT {v.inversor.cuit}
              </p>
            )}
            {v.inversor.dni && (
              <p className="font-mono text-xs text-svi-muted">
                DNI {v.inversor.dni}
              </p>
            )}
            {v.inversor.email && (
              <p className="text-xs text-svi-muted">{v.inversor.email}</p>
            )}
            {v.inversor.telefono && (
              <p className="text-xs text-svi-muted font-mono">
                {v.inversor.telefono}
              </p>
            )}
            {v.inversor.banco_nombre && (
              <p className="text-xs text-svi-muted-2 pt-2 border-t border-svi-border-muted/50 mt-2">
                Banco: {v.inversor.banco_nombre}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <History className="h-4 w-4 text-svi-gold" />
              Historial de tasa
            </span>
            {v.estado !== "finalizada" && (
              <CambiarTasaButton id={v.id} tasaActual={Number(v.tasa_mensual)} />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-sm text-svi-muted-2 py-4">
              Sin cambios de tasa todavía. La tasa actual es{" "}
              <span className="font-mono text-svi-gold">
                {formatPercent(Number(v.tasa_mensual), 2)}
              </span>{" "}
              desde la apertura del contrato.
            </p>
          ) : (
            <ul className="divide-y divide-svi-border-muted/50">
              {historial.map((h) => (
                <li
                  key={h.id}
                  className="py-2 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm">
                      <span className="font-mono text-svi-muted-2">
                        {h.tasa_anterior
                          ? formatPercent(Number(h.tasa_anterior), 2)
                          : "—"}
                      </span>
                      <span className="mx-2 text-svi-muted-2">→</span>
                      <span className="font-mono text-svi-gold">
                        {formatPercent(Number(h.tasa_nueva), 2)}
                      </span>
                    </p>
                    {h.motivo && (
                      <p className="text-xs text-svi-muted mt-0.5">
                        {h.motivo}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-svi-muted-2 font-mono shrink-0">
                    {formatDate(h.vigente_desde)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ContratoFciCard
        inversionId={v.id}
        contratoUrl={v.contrato_url}
        contratoVersion={v.contrato_version}
        contratoHash={v.contrato_hash}
      />

      <AportesPanel
        inversionId={v.id}
        estado={v.estado}
        moneda={moneda}
        capitalActual={Number(v.capital_actual)}
        capitalInicial={Number(v.capital_inicial)}
        aportes={aportes}
      />

      <LiquidacionesInversionPanel
        inversionId={v.id}
        estado={v.estado}
        liquidaciones={liquidaciones}
      />

      {v.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-svi-muted whitespace-pre-wrap">
              {v.observaciones}
            </p>
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
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-svi-muted-2">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${highlight ? "text-svi-gold text-lg font-bold" : "text-svi-white"}`}
      >
        {value}
      </dd>
      {hint && <p className="text-[10px] text-svi-muted-2 mt-0.5">{hint}</p>}
    </div>
  );
}

function mesesEntre(desde: string, hasta: string): number {
  const a = new Date(desde);
  const b = new Date(hasta);
  return (
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) +
    (b.getDate() >= a.getDate() ? 0 : -1)
  );
}
