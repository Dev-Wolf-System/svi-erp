import { notFound } from "next/navigation";
import {
  computeReciboLiquidacionHash,
  type ReciboLiquidacionData,
} from "@repo/pdf/recibo-liquidacion";
import { shortHash } from "@repo/pdf/contrato-venta";
import { formatCurrency, formatDateLong } from "@repo/utils";
import { createServiceClient } from "@/lib/supabase/service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Verificación de recibo — SVI",
  robots: { index: false },
};

interface LiquidacionPublica {
  id: string;
  recibo_hash: string | null;
  periodo: string;
  capital_base: number;
  tasa_aplicada: number;
  monto_interes: number;
  moneda: "ARS" | "USD";
  fecha_pago: string | null;
  metodo_pago: string | null;
  modo_pago_inversor: "retirar" | "reinvertir";
  comprobante_url: string | null;
  capital_actual_post: number;
  inversion: { numero_contrato: string };
  inversor: { nombre: string; dni: string | null; cuit: string | null };
  empresa: { nombre: string; razon_social: string | null; cuit: string | null };
  sucursal: { nombre: string } | null;
}

function ofuscarDoc(doc: string | null): string {
  if (!doc) return "—";
  if (doc.length <= 4) return "*".repeat(doc.length);
  return `${doc.slice(0, 2)}${"*".repeat(doc.length - 4)}${doc.slice(-2)}`;
}

async function fetchPublica(id: string): Promise<LiquidacionPublica | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("liquidaciones_inversion")
    .select(
      `
      id, recibo_hash, periodo, capital_base, tasa_aplicada, monto_interes,
      moneda, fecha_pago, metodo_pago, modo_pago_inversor, comprobante_url,
      inversion:inversiones!liquidaciones_inversion_inversion_id_fkey!inner (
        numero_contrato, capital_actual,
        inversor:inversores!inversiones_inversor_id_fkey!inner ( nombre, dni, cuit ),
        empresa:empresas!inversiones_empresa_id_fkey!inner ( nombre, razon_social, cuit ),
        sucursal:sucursales!inversiones_sucursal_id_fkey ( nombre )
      )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const pickOne = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  const invRow = pickOne(data.inversion as unknown) as {
    numero_contrato: string;
    capital_actual: string;
    inversor: { nombre: string; dni: string | null; cuit: string | null }
      | { nombre: string; dni: string | null; cuit: string | null }[];
    empresa: { nombre: string; razon_social: string | null; cuit: string | null }
      | { nombre: string; razon_social: string | null; cuit: string | null }[];
    sucursal: { nombre: string } | { nombre: string }[] | null;
  } | null;

  if (!invRow) return null;

  // Para reconstruir el canónico necesitamos saber el capital_post:
  // si fue retiro, capital_actual_post = capital_base (capital no cambió);
  // si fue reinversión, capital_actual_post = capital_base + monto_interes.
  // (esto coincide con lo que hace la action)
  const monto = Number(data.monto_interes);
  const capitalBase = Number(data.capital_base);
  const capitalPost =
    data.modo_pago_inversor === "reinvertir"
      ? Number((capitalBase + monto).toFixed(2))
      : capitalBase;

  return {
    id: data.id as string,
    recibo_hash: data.recibo_hash as string | null,
    periodo: data.periodo as string,
    capital_base: capitalBase,
    tasa_aplicada: Number(data.tasa_aplicada),
    monto_interes: monto,
    moneda: (data.moneda as "ARS" | "USD") ?? "ARS",
    fecha_pago: (data.fecha_pago as string | null) ?? null,
    metodo_pago: (data.metodo_pago as string | null) ?? null,
    modo_pago_inversor:
      data.modo_pago_inversor as LiquidacionPublica["modo_pago_inversor"],
    comprobante_url: (data.comprobante_url as string | null) ?? null,
    capital_actual_post: capitalPost,
    inversion: { numero_contrato: invRow.numero_contrato },
    inversor: pickOne(invRow.inversor) as LiquidacionPublica["inversor"],
    empresa: pickOne(invRow.empresa) as LiquidacionPublica["empresa"],
    sucursal: pickOne(invRow.sucursal) as LiquidacionPublica["sucursal"],
  };
}

function buildCanonical(v: LiquidacionPublica): ReciboLiquidacionData {
  const documentoTipo: "DNI" | "CUIT" | "CUIL" = v.inversor.cuit ? "CUIT" : "DNI";
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
    inversor: {
      nombre: v.inversor.nombre,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      banco_nombre: null,
      cbu_ultimos4: null,
    },
    inversion: {
      numero_contrato: v.inversion.numero_contrato,
      moneda: v.moneda,
    },
    liquidacion: {
      periodo: v.periodo,
      capital_base: v.capital_base,
      tasa_aplicada_pct: v.tasa_aplicada,
      monto_interes: v.monto_interes,
      fecha_pago: v.fecha_pago ?? "",
      metodo_pago:
        (v.metodo_pago as ReciboLiquidacionData["liquidacion"]["metodo_pago"]) ??
        "transferencia",
      comprobante_referencia: v.comprobante_url,
      modo_pago_inversor: v.modo_pago_inversor,
      capital_actual_post: v.capital_actual_post,
    },
  };
}

export default async function VerificarReciboPage({ params }: PageProps) {
  const { id } = await params;
  const v = await fetchPublica(id);
  if (!v) notFound();

  const canonical = buildCanonical(v);
  const recalculado = computeReciboLiquidacionHash(canonical);
  const persistido = v.recibo_hash;
  const coincide = persistido != null && persistido === recalculado;
  const sinHashPersistido = persistido == null;

  const docTipo: "DNI" | "CUIT" = v.inversor.cuit ? "CUIT" : "DNI";
  const docNumero = docTipo === "CUIT" ? v.inversor.cuit : v.inversor.dni;
  const esReinversion = v.modo_pago_inversor === "reinvertir";

  return (
    <div className="min-h-screen bg-svi-black text-svi-white px-4 py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
            SVI · verificación de recibo
          </p>
          <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold">
            Recibo de liquidación
          </h1>
          <p className="mt-2 text-sm text-svi-muted-2">
            {v.inversion.numero_contrato} · período{" "}
            {v.periodo.slice(0, 7)}
            {v.fecha_pago ? ` · pagado ${formatDateLong(v.fecha_pago)}` : ""}
          </p>
        </header>

        <StatusBanner coincide={coincide} sinHashPersistido={sinHashPersistido} />

        <section className="rounded-xl border border-svi-border-muted bg-svi-card/50 p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-svi-gold">
            Datos canónicos
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Inversor" value={v.inversor.nombre} />
            <Field label={docTipo} value={ofuscarDoc(docNumero)} mono />
            <Field
              label="Monto liquidado"
              value={formatCurrency(v.monto_interes, v.moneda)}
              mono
              highlight
            />
            <Field
              label="Tasa aplicada"
              value={`${v.tasa_aplicada.toFixed(2)} %`}
              mono
            />
            <Field
              label="Capital base"
              value={formatCurrency(v.capital_base, v.moneda)}
              mono
            />
            <Field
              label="Decisión"
              value={esReinversion ? "Reinversión al capital" : "Retiro"}
            />
            <Field
              label="Capital tras la decisión"
              value={formatCurrency(v.capital_actual_post, v.moneda)}
              mono
            />
            <Field
              label="Empresa"
              value={v.empresa.razon_social ?? v.empresa.nombre}
            />
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
                Hash persistido al emitir el recibo
              </p>
              <p className="font-mono text-xs text-svi-muted break-all">
                {persistido ?? "— sin hash registrado —"}
              </p>
            </div>
          </div>
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
          La liquidación existe pero no tiene recibo PDF firmado. Volver a marcar
          como pagada para regenerar el recibo (requiere bucket recibos-liquidacion).
        </p>
      </div>
    );
  }
  if (coincide) {
    return (
      <div className="mb-6 rounded-xl border border-svi-success/40 bg-svi-success/10 p-5">
        <p className="font-display text-svi-success font-semibold">
          ✓ Recibo auténtico
        </p>
        <p className="text-xs text-svi-muted-2 mt-1.5">
          Los datos del recibo coinciden con lo registrado en el sistema al
          momento del pago.
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
        Los datos actuales generan un SHA-256 distinto al registrado. La
        liquidación pudo haber sido modificada después de la emisión del recibo.
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
