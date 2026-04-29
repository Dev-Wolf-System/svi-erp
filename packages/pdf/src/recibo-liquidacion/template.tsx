import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDateLong } from "@repo/utils/format";
import {
  DataRow,
  Highlight,
  SectionTitle,
  SignatureBlock,
  SignatureRow,
  SviHeader,
  SviIntegrityFooter,
} from "../components";
import { SVI_COLORS, SVI_FONTS, SVI_SIZES } from "../theme";
import type { ReciboLiquidacionData } from "./schema";

export interface ReciboIntegrity {
  hash: string;
  shortHash: string;
  qrDataUrl: string;
  verifyUrl: string;
  contratoVersion: number;
}

const pageStyles = StyleSheet.create({
  page: {
    backgroundColor: SVI_COLORS.white,
    paddingHorizontal: 50,
    paddingTop: 40,
    paddingBottom: 60,
    fontFamily: SVI_FONTS.body,
    color: SVI_COLORS.black,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  metaNumero: {
    fontSize: SVI_SIZES.md,
    color: SVI_COLORS.gold,
    fontFamily: SVI_FONTS.display,
  },
  metaFecha: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
  },
  title: {
    fontSize: SVI_SIZES.xxl,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.black,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    textAlign: "center",
    marginBottom: 18,
    fontStyle: "italic",
  },
  modoBox: {
    marginVertical: 14,
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  modoBoxRetiro: {
    borderColor: SVI_COLORS.gold,
    backgroundColor: SVI_COLORS.goldSoft,
  },
  modoBoxReinversion: {
    borderColor: "#1F7A4D",
    backgroundColor: "#E6F4EC",
  },
  modoLabel: {
    fontSize: 8,
    color: SVI_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 3,
  },
  modoTitulo: {
    fontSize: SVI_SIZES.lg,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.black,
    marginBottom: 4,
  },
  modoText: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.black,
    lineHeight: 1.5,
  },
});

const LABEL_METODO: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo",
  cheque: "Cheque",
  mercadopago: "Mercado Pago",
  compensacion: "Compensación",
  otro: "Otro",
};

function formatPeriodoLargo(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${meses[Number(m[2]) - 1]} de ${m[1]}`;
}

export interface ReciboLiquidacionDocumentProps {
  data: ReciboLiquidacionData;
  logoDataUrl?: string | null;
  integrity?: ReciboIntegrity | null;
}

export function ReciboLiquidacionDocument({
  data,
  logoDataUrl,
  integrity,
}: ReciboLiquidacionDocumentProps) {
  const { empresa, sucursal, inversor, inversion, liquidacion } = data;
  const moneda = inversion.moneda;
  const esReinversion = liquidacion.modo_pago_inversor === "reinvertir";

  return (
    <Document
      title={`Recibo ${inversion.numero_contrato} ${liquidacion.periodo.slice(0, 7)}`}
      author={empresa.razon_social}
      subject={`Recibo de pago de liquidación ${formatPeriodoLargo(liquidacion.periodo)}`}
    >
      <Page size="A4" style={pageStyles.page}>
        <SviHeader
          empresaNombre={empresa.nombre}
          empresaCuit={empresa.cuit}
          empresaTelefono={empresa.telefono}
          empresaEmail={empresa.email}
          sucursalNombre={sucursal.nombre}
          sucursalDireccion={sucursal.direccion}
          logoDataUrl={logoDataUrl}
        />

        <View style={pageStyles.metaRow}>
          <Text style={pageStyles.metaNumero}>
            CONTRATO N° {inversion.numero_contrato}
          </Text>
          <Text style={pageStyles.metaFecha}>
            Emitido: {formatDateLong(liquidacion.fecha_pago)}
          </Text>
        </View>

        <Text style={pageStyles.title}>RECIBO DE PAGO</Text>
        <Text style={pageStyles.subtitle}>
          Liquidación FCI · {formatPeriodoLargo(liquidacion.periodo)}
        </Text>

        <SectionTitle>Inversor</SectionTitle>
        <DataRow label="Nombre completo:" value={inversor.nombre} />
        <DataRow
          label={`${inversor.documento_tipo}:`}
          value={inversor.documento_numero}
        />
        {inversor.banco_nombre ? (
          <DataRow
            label="Banco:"
            value={
              inversor.cbu_ultimos4
                ? `${inversor.banco_nombre} (CBU ****${inversor.cbu_ultimos4})`
                : inversor.banco_nombre
            }
          />
        ) : null}

        <SectionTitle>Cálculo del período</SectionTitle>
        <DataRow
          label="Capital base:"
          value={formatCurrency(liquidacion.capital_base, moneda)}
        />
        <DataRow
          label="Tasa aplicada:"
          value={`${liquidacion.tasa_aplicada_pct.toFixed(2)} % mensual`}
        />
        <Highlight
          label={`Monto liquidado · ${moneda}`}
          value={formatCurrency(liquidacion.monto_interes, moneda)}
        />

        <SectionTitle>Pago</SectionTitle>
        <DataRow
          label="Fecha de pago:"
          value={formatDateLong(liquidacion.fecha_pago)}
        />
        <DataRow
          label="Método:"
          value={LABEL_METODO[liquidacion.metodo_pago] ?? liquidacion.metodo_pago}
        />
        {liquidacion.comprobante_referencia ? (
          <DataRow
            label="Comprobante:"
            value={liquidacion.comprobante_referencia}
          />
        ) : null}

        <View
          style={[
            pageStyles.modoBox,
            esReinversion
              ? pageStyles.modoBoxReinversion
              : pageStyles.modoBoxRetiro,
          ]}
        >
          <Text style={pageStyles.modoLabel}>Decisión del inversor</Text>
          <Text style={pageStyles.modoTitulo}>
            {esReinversion ? "REINVERSIÓN AL CAPITAL" : "RETIRO DEL DINERO"}
          </Text>
          <Text style={pageStyles.modoText}>
            {esReinversion
              ? `El inversor opta por reinvertir el monto liquidado, sumándolo al capital de la inversión. El nuevo capital queda fijado en ${formatCurrency(liquidacion.capital_actual_post, moneda)} y servirá de base para el cálculo del próximo período.`
              : `El inversor recibe el monto liquidado en concepto de interés del período. El capital de la inversión permanece en ${formatCurrency(liquidacion.capital_actual_post, moneda)}.`}
          </Text>
        </View>

        <SignatureRow>
          <SignatureBlock
            rol="EL INVERSOR"
            nombre={inversor.nombre}
            documento={`Recibí conforme · ${inversor.documento_tipo}: ${inversor.documento_numero}`}
          />
          <SignatureBlock
            rol="POR LA EMPRESA"
            nombre={empresa.razon_social.toUpperCase()}
            documento="Sello y firma autorizada"
          />
        </SignatureRow>

        {integrity ? (
          <SviIntegrityFooter
            numeroOperacion={`${inversion.numero_contrato} · ${liquidacion.periodo.slice(0, 7)}`}
            shortHash={integrity.shortHash}
            fullHash={integrity.hash}
            contratoVersion={integrity.contratoVersion}
            qrDataUrl={integrity.qrDataUrl}
            verifyUrl={integrity.verifyUrl}
            ejemplar="ORIGINAL"
          />
        ) : null}
      </Page>
    </Document>
  );
}
