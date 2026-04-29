import { notFound } from "next/navigation";
import {
  computeContratoFciHash,
  type ContratoFciData,
} from "@repo/pdf/contrato-fci";
import { shortHash } from "@repo/pdf/contrato-venta";
import { formatCurrency, formatDateLong } from "@repo/utils";
import { createServiceClient } from "@/lib/supabase/service";

interface PageProps {
  params: Promise<{ numero: string }>;
}

export const metadata = {
  title: "Verificación de contrato FCI — SVI",
  robots: { index: false },
};

interface InversionPublica {
  numero_contrato: string;
  contrato_hash: string | null;
  contrato_version: number;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  capital_inicial: number;
  moneda: "ARS" | "USD";
  tasa_mensual: number;
  tipo_instrumento: ContratoFciData["inversion"]["tipo_instrumento"];
  estado_regulatorio: ContratoFciData["inversion"]["estado_regulatorio"];
  firma_metodo: string;
  inversor: {
    nombre: string;
    dni: string | null;
    cuit: string | null;
  };
  empresa: { nombre: string; razon_social: string | null; cuit: string | null };
  sucursal: { nombre: string } | null;
}

async function fetchInversionPublica(
  numero: string,
): Promise<InversionPublica | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("inversiones")
    .select(
      `
      numero_contrato, contrato_hash, contrato_version,
      fecha_inicio, fecha_vencimiento,
      capital_inicial, moneda, tasa_mensual,
      tipo_instrumento, estado_regulatorio, firma_metodo,
      inversor:inversores!inversiones_inversor_id_fkey!inner ( nombre, dni, cuit ),
      empresa:empresas!inversiones_empresa_id_fkey!inner ( nombre, razon_social, cuit ),
      sucursal:sucursales!inversiones_sucursal_id_fkey ( nombre )
      `,
    )
    .eq("numero_contrato", numero)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const pickOne = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  return {
    numero_contrato: data.numero_contrato as string,
    contrato_hash: data.contrato_hash as string | null,
    contrato_version: (data.contrato_version as number) ?? 0,
    fecha_inicio: data.fecha_inicio as string,
    fecha_vencimiento: (data.fecha_vencimiento as string | null) ?? null,
    capital_inicial: Number(data.capital_inicial),
    moneda: (data.moneda as "ARS" | "USD") ?? "ARS",
    tasa_mensual: Number(data.tasa_mensual),
    tipo_instrumento:
      data.tipo_instrumento as InversionPublica["tipo_instrumento"],
    estado_regulatorio:
      data.estado_regulatorio as InversionPublica["estado_regulatorio"],
    firma_metodo: data.firma_metodo as string,
    inversor: pickOne(data.inversor) as InversionPublica["inversor"],
    empresa: pickOne(data.empresa) as InversionPublica["empresa"],
    sucursal: pickOne(data.sucursal) as InversionPublica["sucursal"],
  };
}

function ofuscarDoc(doc: string | null): string {
  if (!doc) return "—";
  if (doc.length <= 4) return "*".repeat(doc.length);
  return `${doc.slice(0, 2)}${"*".repeat(doc.length - 4)}${doc.slice(-2)}`;
}

function buildCanonicalData(v: InversionPublica): ContratoFciData {
  const documentoTipo: "DNI" | "CUIT" | "CUIL" = v.inversor.cuit
    ? "CUIT"
    : "DNI";
  const documentoNumero =
    documentoTipo === "CUIT"
      ? (v.inversor.cuit ?? "")
      : (v.inversor.dni ?? v.inversor.cuit ?? "");

  return {
    empresa: {
      nombre: v.empresa.nombre,
      razon_social: v.empresa.razon_social ?? v.empresa.nombre,
      cuit: v.empresa.cuit ?? "",
      telefono: null,
      email: null,
    },
    sucursal: { nombre: v.sucursal?.nombre ?? "—", direccion: null },
    inversion: {
      numero_contrato: v.numero_contrato,
      fecha_inicio: v.fecha_inicio,
      fecha_vencimiento: v.fecha_vencimiento,
      moneda: v.moneda,
      capital_inicial: v.capital_inicial,
      tasa_mensual_pct: v.tasa_mensual,
      tipo_instrumento: v.tipo_instrumento,
      estado_regulatorio: v.estado_regulatorio,
      firma_metodo: v.firma_metodo,
      observaciones: null,
    },
    inversor: {
      nombre: v.inversor.nombre,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      email: null,
      telefono: null,
      banco_nombre: null,
      cbu_ultimos4: null,
    },
  };
}

const LABEL_TIPO: Record<InversionPublica["tipo_instrumento"], string> = {
  mutuo: "Mutuo simple",
  fideicomiso: "Fideicomiso",
  fci_cnv: "FCI inscripto CNV",
  prestamo_participativo: "Préstamo participativo",
  otro: "Otro",
};

const LABEL_REGULATORIO: Record<
  InversionPublica["estado_regulatorio"],
  string
> = {
  pre_dictamen: "Pre-dictamen",
  vigente: "Vigente",
  ajuste_requerido: "Ajuste requerido",
};

export default async function VerificarContratoFciPage({ params }: PageProps) {
  const { numero } = await params;
  const v = await fetchInversionPublica(numero);
  if (!v) notFound();

  const canonical = buildCanonicalData(v);
  const recalculado = computeContratoFciHash(canonical);
  const persistido = v.contrato_hash;
  const coincide = persistido != null && persistido === recalculado;
  const sinHashPersistido = persistido == null;

  const docTipo: "DNI" | "CUIT" = v.inversor.cuit ? "CUIT" : "DNI";
  const docNumero = docTipo === "CUIT" ? v.inversor.cuit : v.inversor.dni;

  return (
    <div className="min-h-screen bg-svi-black text-svi-white px-4 py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
            SVI · verificación de contrato FCI
          </p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold">
            {v.numero_contrato}
          </h1>
          <p className="mt-2 text-sm text-svi-muted-2">
            {LABEL_TIPO[v.tipo_instrumento]} · v{v.contrato_version} ·{" "}
            {formatDateLong(v.fecha_inicio)}
          </p>
        </header>

        <StatusBanner coincide={coincide} sinHashPersistido={sinHashPersistido} />

        <section className="rounded-xl border border-svi-border-muted bg-svi-card/50 p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-svi-gold">
            Datos canónicos del documento
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Inversor" value={v.inversor.nombre} />
            <Field label={docTipo} value={ofuscarDoc(docNumero)} mono />
            <Field
              label="Capital inicial"
              value={formatCurrency(v.capital_inicial, v.moneda)}
              mono
              highlight
            />
            <Field
              label="Tasa mensual"
              value={`${v.tasa_mensual.toFixed(2)} %`}
              mono
            />
            <Field
              label="Vencimiento"
              value={
                v.fecha_vencimiento
                  ? formatDateLong(v.fecha_vencimiento)
                  : "Sin plazo"
              }
            />
            <Field label="Régimen legal" value={LABEL_REGULATORIO[v.estado_regulatorio]} />
            <Field
              label="Empresa"
              value={v.empresa.razon_social ?? v.empresa.nombre}
            />
            <Field label="Sucursal" value={v.sucursal?.nombre ?? "—"} />
          </dl>
        </section>

        <section className="mt-6 rounded-xl border border-svi-border-muted bg-svi-card/50 p-6 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-svi-gold">
            Sello de integridad SHA-256
          </h2>
          <div className="text-sm space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                Recalculado en este momento
              </p>
              <p className="font-mono text-xs text-svi-white break-all">
                {recalculado}
              </p>
              <p className="font-mono text-svi-gold mt-1">
                {shortHash(recalculado)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                Hash persistido en la última generación del PDF
              </p>
              <p className="font-mono text-xs text-svi-muted break-all">
                {persistido ?? "— sin hash registrado —"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-svi-muted-2 leading-relaxed pt-2 border-t border-svi-border-muted/50">
            Verificación <strong>técnica</strong>: confirma que los datos legales
            del contrato no fueron alterados desde la emisión. No constituye
            firma digital legal bajo Ley 25.506.
          </p>
        </section>

        <footer className="text-center mt-10 text-xs text-svi-muted-2">
          <p>Solo Vehículos Impecables — concesionario de autos</p>
        </footer>
      </div>
    </div>
  );
}

function StatusBanner({
  coincide,
  sinHashPersistido,
}: {
  coincide: boolean;
  sinHashPersistido: boolean;
}) {
  if (sinHashPersistido) {
    return (
      <div className="mb-6 rounded-xl border border-svi-warning/40 bg-svi-warning/10 p-5">
        <p className="font-display text-svi-warning font-semibold">
          ⚠ Sin hash registrado
        </p>
        <p className="text-xs text-svi-muted-2 mt-1.5">
          La inversión existe pero no tiene PDF firmado con sello de integridad.
          Generá el contrato desde el panel admin para producir el hash.
        </p>
      </div>
    );
  }
  if (coincide) {
    return (
      <div className="mb-6 rounded-xl border border-svi-success/40 bg-svi-success/10 p-5">
        <p className="font-display text-svi-success font-semibold">
          ✓ Documento auténtico
        </p>
        <p className="text-xs text-svi-muted-2 mt-1.5">
          El SHA-256 calculado coincide con el persistido al generar el PDF.
          Los datos legales del contrato no fueron modificados.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-xl border border-svi-error/40 bg-svi-error/10 p-5">
      <p className="font-display text-svi-error font-semibold">
        ✗ El hash no coincide
      </p>
      <p className="text-xs text-svi-muted-2 mt-1.5">
        Los datos canónicos actuales generan un SHA-256 distinto al registrado
        en la última emisión del PDF. La inversión cambió y debe regenerarse el
        contrato, o el PDF que tenés es de una versión anterior.
      </p>
    </div>
  );
}

function Field({
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
      <dt className="text-[10px] uppercase tracking-wider text-svi-muted-2">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${
          highlight ? "text-svi-gold text-base font-semibold" : "text-svi-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
