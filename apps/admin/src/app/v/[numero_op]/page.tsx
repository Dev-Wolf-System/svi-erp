import { notFound } from "next/navigation";
import {
  computeContratoHash,
  shortHash,
  type ContratoVentaData,
} from "@repo/pdf/contrato-venta";
import { formatCurrency, formatDateLong } from "@repo/utils";
import { createServiceClient } from "@/lib/supabase/service";

interface PageProps {
  params: Promise<{ numero_op: string }>;
}

export const metadata = {
  title: "Verificación de contrato — SVI",
  robots: { index: false },
};

interface VentaPublica {
  numero_operacion: string;
  contrato_hash: string | null;
  contrato_version: number;
  created_at: string;
  precio_venta: number;
  descuento: number;
  precio_final: number;
  moneda: "ARS" | "USD";
  tipo_pago: "contado" | "financiado" | "parte_pago";
  valor_parte: number | null;
  monto_financiado: number | null;
  cuotas: number | null;
  tasa_banco: number | null;
  legajo_banco: string | null;
  vehiculo: { marca: string; modelo: string; anio: number; patente: string | null };
  vehiculo_parte: { marca: string; modelo: string; anio: number; patente: string | null } | null;
  banco: { nombre: string } | null;
  cliente: {
    tipo: "persona" | "empresa";
    nombre: string;
    apellido: string | null;
    razon_social: string | null;
    dni: string | null;
    cuit: string | null;
  };
  empresa: { nombre: string; razon_social: string | null; cuit: string | null };
  sucursal: { nombre: string };
}

async function fetchVentaPublica(numeroOp: string): Promise<VentaPublica | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("ventas")
    .select(
      `
      numero_operacion, contrato_hash, contrato_version, created_at,
      precio_venta, descuento, precio_final, moneda, tipo_pago,
      valor_parte, monto_financiado, cuotas, tasa_banco, legajo_banco,
      vehiculo:vehiculos!ventas_vehiculo_id_fkey!inner ( marca, modelo, anio, patente ),
      vehiculo_parte:vehiculos!ventas_vehiculo_parte_id_fkey ( marca, modelo, anio, patente ),
      banco:bancos!ventas_banco_id_fkey ( nombre ),
      cliente:clientes!ventas_cliente_id_fkey!inner ( tipo, nombre, apellido, razon_social, dni, cuit ),
      empresa:empresas!ventas_empresa_id_fkey!inner ( nombre, razon_social, cuit ),
      sucursal:sucursales!ventas_sucursal_id_fkey!inner ( nombre )
    `,
    )
    .eq("numero_operacion", numeroOp)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const pickOne = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  return {
    numero_operacion: data.numero_operacion as string,
    contrato_hash: data.contrato_hash as string | null,
    contrato_version: (data.contrato_version as number) ?? 0,
    created_at: data.created_at as string,
    precio_venta: Number(data.precio_venta),
    descuento: Number(data.descuento),
    precio_final: Number(data.precio_final),
    moneda: (data.moneda as "ARS" | "USD") ?? "ARS",
    tipo_pago: data.tipo_pago as VentaPublica["tipo_pago"],
    valor_parte: data.valor_parte != null ? Number(data.valor_parte) : null,
    monto_financiado: data.monto_financiado != null ? Number(data.monto_financiado) : null,
    cuotas: (data.cuotas as number | null) ?? null,
    tasa_banco: data.tasa_banco != null ? Number(data.tasa_banco) : null,
    legajo_banco: (data.legajo_banco as string | null) ?? null,
    vehiculo: pickOne(data.vehiculo) as VentaPublica["vehiculo"],
    vehiculo_parte: pickOne(data.vehiculo_parte) as VentaPublica["vehiculo_parte"],
    banco: pickOne(data.banco) as VentaPublica["banco"],
    cliente: pickOne(data.cliente) as VentaPublica["cliente"],
    empresa: pickOne(data.empresa) as VentaPublica["empresa"],
    sucursal: pickOne(data.sucursal) as VentaPublica["sucursal"],
  };
}

function ofuscarDoc(doc: string | null): string {
  if (!doc) return "—";
  if (doc.length <= 4) return "*".repeat(doc.length);
  return `${doc.slice(0, 2)}${"*".repeat(doc.length - 4)}${doc.slice(-2)}`;
}

function buildCanonicalData(v: VentaPublica): ContratoVentaData {
  const documentoTipo: "DNI" | "CUIT" | "CUIL" =
    v.cliente.tipo === "empresa" ? "CUIT" : v.cliente.dni ? "DNI" : "CUIT";
  const documentoNumero =
    documentoTipo === "DNI"
      ? (v.cliente.dni ?? "")
      : (v.cliente.cuit ?? v.cliente.dni ?? "");

  return {
    empresa: {
      nombre: v.empresa.nombre,
      razon_social: v.empresa.razon_social ?? v.empresa.nombre,
      cuit: v.empresa.cuit ?? "",
      telefono: null,
      email: null,
    },
    sucursal: { nombre: v.sucursal.nombre, direccion: null },
    venta: {
      numero_operacion: v.numero_operacion,
      fecha: v.created_at,
      moneda: v.moneda,
      precio_venta: v.precio_venta,
      descuento: v.descuento,
      precio_final: v.precio_final,
      tipo_pago: v.tipo_pago,
      notas: null,
    },
    vehiculo: {
      marca: v.vehiculo.marca,
      modelo: v.vehiculo.modelo,
      anio: v.vehiculo.anio,
      dominio: v.vehiculo.patente ?? "—",
      chasis: null,
      motor: null,
      color: null,
      kilometros: null,
    },
    cliente: {
      tipo: v.cliente.tipo,
      nombre:
        v.cliente.tipo === "empresa"
          ? v.cliente.razon_social ?? v.cliente.nombre
          : v.cliente.nombre,
      apellido: v.cliente.apellido,
      documento_tipo: documentoTipo,
      documento_numero: documentoNumero,
      direccion: null,
      telefono: null,
      email: null,
    },
    parte_pago:
      v.tipo_pago === "parte_pago" && v.vehiculo_parte && v.valor_parte != null
        ? {
            marca: v.vehiculo_parte.marca,
            modelo: v.vehiculo_parte.modelo,
            anio: v.vehiculo_parte.anio,
            dominio: v.vehiculo_parte.patente ?? "—",
            valor: v.valor_parte,
          }
        : null,
    financiacion:
      v.tipo_pago === "financiado" &&
      v.banco &&
      v.monto_financiado != null &&
      v.cuotas != null &&
      v.tasa_banco != null
        ? {
            banco_nombre: v.banco.nombre,
            legajo: v.legajo_banco,
            monto_financiado: v.monto_financiado,
            cuotas: v.cuotas,
            tasa_pct: v.tasa_banco,
          }
        : null,
  };
}

export default async function VerificarContratoPage({ params }: PageProps) {
  const { numero_op } = await params;
  const v = await fetchVentaPublica(numero_op);
  if (!v) notFound();

  const canonical = buildCanonicalData(v);
  const recalculado = computeContratoHash(canonical);
  const persistido = v.contrato_hash;
  const coincide = persistido != null && persistido === recalculado;
  const sinHashPersistido = persistido == null;

  const cliente =
    v.cliente.tipo === "empresa"
      ? v.cliente.razon_social ?? v.cliente.nombre
      : [v.cliente.apellido, v.cliente.nombre].filter(Boolean).join(", ");
  const docTipo =
    v.cliente.tipo === "empresa" ? "CUIT" : v.cliente.dni ? "DNI" : "CUIT";
  const docNumero =
    docTipo === "DNI" ? v.cliente.dni : (v.cliente.cuit ?? v.cliente.dni);

  return (
    <div className="min-h-screen bg-svi-black text-svi-white px-4 py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
            SVI · verificación de contrato
          </p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold">
            {v.numero_operacion}
          </h1>
          <p className="mt-2 text-sm text-svi-muted-2">
            Versión v{v.contrato_version} · {formatDateLong(v.created_at)}
          </p>
        </header>

        <StatusBanner
          coincide={coincide}
          sinHashPersistido={sinHashPersistido}
        />

        <section className="rounded-xl border border-svi-border-muted bg-svi-card/50 p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-svi-gold">
            Datos canónicos del documento
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Vehículo" value={`${v.vehiculo.marca} ${v.vehiculo.modelo} ${v.vehiculo.anio}`} />
            <Field
              label="Dominio"
              value={v.vehiculo.patente ?? "—"}
              mono
            />
            <Field
              label="Comprador"
              value={cliente || "—"}
            />
            <Field
              label={docTipo}
              value={ofuscarDoc(docNumero)}
              mono
            />
            <Field
              label="Modalidad"
              value={
                v.tipo_pago === "contado"
                  ? "Contado"
                  : v.tipo_pago === "financiado"
                    ? "Financiado"
                    : "Parte de pago + saldo"
              }
            />
            <Field
              label="Precio final"
              value={formatCurrency(v.precio_final, v.moneda)}
              mono
              highlight
            />
            <Field
              label="Empresa"
              value={v.empresa.razon_social ?? v.empresa.nombre}
            />
            <Field label="Sucursal" value={v.sucursal.nombre} />
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
              <p className="font-mono text-svi-gold mt-1">{shortHash(recalculado)}</p>
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
            Esta verificación es <strong>técnica</strong>: confirma que los datos legales del
            contrato no fueron alterados respecto del momento de su emisión. No constituye
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
          Esta operación existe en el sistema pero no se generó un PDF firmado con sello
          de integridad. Puede tratarse de un contrato emitido antes de habilitar la
          autenticidad técnica.
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
          El SHA-256 calculado de los datos canónicos coincide con el hash registrado al
          generar el PDF. La información económica del contrato no fue modificada.
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
        Los datos canónicos actuales generan un SHA-256 distinto al registrado en la
        última emisión del PDF. Posibles causas: el contrato se modificó (precio,
        cliente, vehículo) y se debe regenerar el documento, o el PDF que tenés
        corresponde a una versión anterior.
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
