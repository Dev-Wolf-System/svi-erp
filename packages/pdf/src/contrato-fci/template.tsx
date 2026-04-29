import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDateLong } from "@repo/utils/format";
import {
  DataRow,
  Highlight,
  LegalParagraph,
  SectionTitle,
  SignatureBlock,
  SignatureRow,
  SviFooter,
  SviHeader,
  SviIntegrityFooter,
} from "../components";
import { SVI_COLORS, SVI_FONTS, SVI_SIZES } from "../theme";
import type { ContratoFciData } from "./schema";

export interface ContratoFciIntegrity {
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
    marginBottom: 20,
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
    marginBottom: 6,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    textAlign: "center",
    marginBottom: 18,
    fontStyle: "italic",
  },
  notas: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 6,
  },
  preDictamen: {
    fontSize: SVI_SIZES.xs,
    color: "#9A6E00",
    backgroundColor: "#FFF7E0",
    borderLeftWidth: 3,
    borderLeftColor: "#D4A017",
    padding: 6,
    marginVertical: 8,
  },
});

const SUBTITULO_POR_TIPO: Record<ContratoFciData["inversion"]["tipo_instrumento"], string> = {
  mutuo: "Contrato de mutuo simple",
  fideicomiso: "Contrato de fideicomiso financiero",
  fci_cnv: "Suscripción al Fondo Común de Inversión inscripto en CNV",
  prestamo_participativo: "Contrato de préstamo participativo",
  otro: "Contrato de inversión",
};

export interface ContratoFciDocumentProps {
  data: ContratoFciData;
  logoDataUrl?: string | null;
  integrity?: ContratoFciIntegrity | null;
}

export function ContratoFciDocument({
  data,
  logoDataUrl,
  integrity,
}: ContratoFciDocumentProps) {
  const { empresa, sucursal, inversion, inversor } = data;
  const moneda = inversion.moneda;
  const subtitulo = SUBTITULO_POR_TIPO[inversion.tipo_instrumento];

  return (
    <Document
      title={`Contrato FCI ${inversion.numero_contrato}`}
      author={empresa.razon_social}
      subject={subtitulo}
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
            Fecha: {formatDateLong(inversion.fecha_inicio)}
          </Text>
        </View>

        <Text style={pageStyles.title}>CONTRATO DE INVERSIÓN</Text>
        <Text style={pageStyles.subtitle}>{subtitulo}</Text>

        {inversion.estado_regulatorio === "pre_dictamen" && (
          <Text style={pageStyles.preDictamen}>
            ⚠ Operación celebrada bajo régimen de mutuo simple, pendiente de
            dictamen jurídico definitivo. Las condiciones podrán ser ajustadas
            sin perjuicio del capital aportado y los intereses devengados.
          </Text>
        )}

        <SectionTitle>Datos del inversor</SectionTitle>
        <DataRow label="Nombre completo:" value={inversor.nombre} />
        <DataRow
          label={`${inversor.documento_tipo}:`}
          value={inversor.documento_numero}
        />
        {inversor.email ? <DataRow label="Email:" value={inversor.email} /> : null}
        {inversor.telefono ? (
          <DataRow label="Teléfono:" value={inversor.telefono} />
        ) : null}
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

        <SectionTitle>Condiciones económicas</SectionTitle>
        <Highlight
          label={`Capital aportado · ${moneda}`}
          value={formatCurrency(inversion.capital_inicial, moneda)}
        />
        <DataRow
          label="Tasa de interés:"
          value={`${inversion.tasa_mensual_pct.toFixed(2)} % mensual`}
        />
        <DataRow
          label="Inicio de operación:"
          value={formatDateLong(inversion.fecha_inicio)}
        />
        {inversion.fecha_vencimiento ? (
          <DataRow
            label="Vencimiento:"
            value={formatDateLong(inversion.fecha_vencimiento)}
          />
        ) : (
          <DataRow label="Plazo:" value="Sin plazo definido — renovación tácita" />
        )}
        <DataRow label="Método de firma:" value={inversion.firma_metodo} />

        {inversion.observaciones ? (
          <Text style={pageStyles.notas}>
            Observaciones: {inversion.observaciones}
          </Text>
        ) : null}

        <SectionTitle>Cláusulas</SectionTitle>
        <LegalParagraph>
          PRIMERA — OBJETO. El INVERSOR aporta a {empresa.razon_social.toUpperCase()}{" "}
          (en adelante, &quot;LA RECEPTORA&quot;) el capital indicado en estas
          condiciones, en concepto de mutuo, con el destino de financiar el giro
          comercial habitual de la concesionaria. LA RECEPTORA se obliga a
          restituir el capital y abonar los intereses pactados conforme las
          condiciones precedentes.
        </LegalParagraph>
        <LegalParagraph>
          SEGUNDA — INTERESES. Los intereses pactados son del{" "}
          {inversion.tasa_mensual_pct.toFixed(2)}% nominal mensual aplicado
          sobre el capital vigente. Se liquidan mensualmente y son abonados al
          INVERSOR mediante transferencia bancaria a la cuenta que indique, sin
          necesidad de interpelación previa.
        </LegalParagraph>
        <LegalParagraph>
          TERCERA — REINVERSIÓN. Salvo instrucción expresa en contrario por
          parte del INVERSOR, los intereses devengados se liquidan y abonan
          mensualmente sin reinversión automática. Toda modificación al modo de
          capitalización deberá constar por escrito y suscribirse por ambas
          partes.
        </LegalParagraph>
        <LegalParagraph>
          CUARTA — RESCATE. El INVERSOR podrá solicitar el rescate del capital
          aportado mediante notificación fehaciente con NOVENTA (90) días de
          anticipación. Solicitudes anticipadas podrán acordarse caso por caso
          y, según corresponda, devengarán los costos administrativos
          correspondientes.
        </LegalParagraph>
        <LegalParagraph>
          QUINTA — RIESGO. Las partes reconocen que la operación no se
          encuentra alcanzada por la garantía del Banco Central de la República
          Argentina ni por seguros de depósito. El INVERSOR declara aceptar el
          riesgo asociado al giro comercial de LA RECEPTORA.
        </LegalParagraph>
        <LegalParagraph>
          SEXTA — JURISDICCIÓN. Las partes constituyen domicilios especiales en
          los indicados en el presente y se someten a la jurisdicción de los
          Tribunales Ordinarios competentes con renuncia expresa a cualquier
          otro fuero o jurisdicción.
        </LegalParagraph>

        <SignatureRow>
          <SignatureBlock
            rol="EL INVERSOR"
            nombre={inversor.nombre}
            documento={`${inversor.documento_tipo}: ${inversor.documento_numero}`}
          />
          <SignatureBlock
            rol="POR LA RECEPTORA"
            nombre={empresa.razon_social.toUpperCase()}
            documento="Sello y firma autorizada"
          />
        </SignatureRow>

        {integrity ? (
          <SviIntegrityFooter
            numeroOperacion={inversion.numero_contrato}
            shortHash={integrity.shortHash}
            fullHash={integrity.hash}
            contratoVersion={integrity.contratoVersion}
            qrDataUrl={integrity.qrDataUrl}
            verifyUrl={integrity.verifyUrl}
          />
        ) : (
          <SviFooter />
        )}
      </Page>
    </Document>
  );
}
