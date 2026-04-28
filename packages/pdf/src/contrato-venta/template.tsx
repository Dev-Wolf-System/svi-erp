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
} from "../components";
import { SVI_COLORS, SVI_FONTS, SVI_SIZES } from "../theme";
import type { ContratoVentaData } from "./schema";

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
    marginBottom: 20,
    letterSpacing: 2,
  },
  notas: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 6,
  },
});

function clienteFullName(c: ContratoVentaData["cliente"]): string {
  return c.apellido ? `${c.apellido}, ${c.nombre}` : c.nombre;
}

export function ContratoVentaDocument({ data }: { data: ContratoVentaData }) {
  const { empresa, sucursal, venta, vehiculo, cliente, parte_pago, financiacion } = data;
  const moneda = venta.moneda;

  return (
    <Document
      title={`Contrato de Venta ${venta.numero_operacion}`}
      author={empresa.razon_social}
      subject="Boleto de compraventa de vehículo"
    >
      <Page size="A4" style={pageStyles.page}>
        <SviHeader
          empresaNombre={empresa.nombre}
          empresaCuit={empresa.cuit}
          empresaTelefono={empresa.telefono}
          empresaEmail={empresa.email}
          sucursalNombre={sucursal.nombre}
          sucursalDireccion={sucursal.direccion}
        />

        <View style={pageStyles.metaRow}>
          <Text style={pageStyles.metaNumero}>OPERACIÓN N° {venta.numero_operacion}</Text>
          <Text style={pageStyles.metaFecha}>Fecha: {formatDateLong(venta.fecha)}</Text>
        </View>

        <Text style={pageStyles.title}>BOLETO DE COMPRAVENTA</Text>

        <SectionTitle>Datos del comprador</SectionTitle>
        <DataRow
          label={cliente.tipo === "empresa" ? "Razón social:" : "Nombre completo:"}
          value={clienteFullName(cliente)}
        />
        <DataRow
          label={`${cliente.documento_tipo}:`}
          value={cliente.documento_numero}
        />
        {cliente.direccion ? (
          <DataRow label="Domicilio:" value={cliente.direccion} />
        ) : null}
        {cliente.telefono ? (
          <DataRow label="Teléfono:" value={cliente.telefono} />
        ) : null}
        {cliente.email ? <DataRow label="Email:" value={cliente.email} /> : null}

        <SectionTitle>Vehículo objeto de la operación</SectionTitle>
        <DataRow
          label="Marca / Modelo:"
          value={`${vehiculo.marca} ${vehiculo.modelo}`}
        />
        <DataRow label="Año:" value={String(vehiculo.anio)} />
        <DataRow label="Dominio:" value={vehiculo.dominio} />
        {vehiculo.chasis ? <DataRow label="N° Chasis:" value={vehiculo.chasis} /> : null}
        {vehiculo.motor ? <DataRow label="N° Motor:" value={vehiculo.motor} /> : null}
        {vehiculo.color ? <DataRow label="Color:" value={vehiculo.color} /> : null}
        {vehiculo.kilometros != null ? (
          <DataRow
            label="Kilometraje:"
            value={`${new Intl.NumberFormat("es-AR").format(vehiculo.kilometros)} km`}
          />
        ) : null}

        <SectionTitle>Condiciones económicas</SectionTitle>
        <Highlight
          label={`Precio final acordado · ${moneda}`}
          value={formatCurrency(venta.precio_final, moneda)}
        />
        <DataRow
          label="Precio lista:"
          value={formatCurrency(venta.precio_venta, moneda)}
        />
        {venta.descuento > 0 ? (
          <DataRow
            label="Descuento aplicado:"
            value={`- ${formatCurrency(venta.descuento, moneda)}`}
          />
        ) : null}
        <DataRow
          label="Modalidad de pago:"
          value={
            venta.tipo_pago === "contado"
              ? "Contado"
              : venta.tipo_pago === "financiado"
                ? "Financiado por banco"
                : "Parte de pago + saldo"
          }
        />

        {parte_pago ? (
          <>
            <SectionTitle>Vehículo entregado en parte de pago</SectionTitle>
            <DataRow
              label="Marca / Modelo:"
              value={`${parte_pago.marca} ${parte_pago.modelo} (${parte_pago.anio})`}
            />
            <DataRow label="Dominio:" value={parte_pago.dominio} />
            <DataRow
              label="Valor reconocido:"
              value={formatCurrency(parte_pago.valor, moneda)}
            />
          </>
        ) : null}

        {financiacion ? (
          <>
            <SectionTitle>Financiación bancaria</SectionTitle>
            <DataRow label="Entidad:" value={financiacion.banco_nombre} />
            {financiacion.legajo ? (
              <DataRow label="N° Legajo:" value={financiacion.legajo} />
            ) : null}
            <DataRow
              label="Monto financiado:"
              value={formatCurrency(financiacion.monto_financiado, moneda)}
            />
            <DataRow label="Cuotas:" value={String(financiacion.cuotas)} />
            <DataRow label="TNA:" value={`${financiacion.tasa_pct.toFixed(2)} %`} />
          </>
        ) : null}

        {venta.notas ? <Text style={pageStyles.notas}>Observaciones: {venta.notas}</Text> : null}

        <SectionTitle>Términos y condiciones</SectionTitle>
        <LegalParagraph>
          El presente boleto formaliza la operación de compraventa entre {empresa.razon_social}
          {" "}(en adelante, &quot;LA VENDEDORA&quot;) y la persona identificada como comprador
          (en adelante, &quot;EL COMPRADOR&quot;), respecto del vehículo individualizado en este
          documento. EL COMPRADOR declara haber inspeccionado la unidad y aceptarla en el
          estado en que se encuentra, conforme al artículo 1142 y concordantes del Código Civil
          y Comercial de la Nación. La transferencia de dominio se perfeccionará mediante el
          Formulario 08 ante el Registro Nacional de la Propiedad Automotor correspondiente.
        </LegalParagraph>
        <LegalParagraph>
          LA VENDEDORA garantiza la titularidad del vehículo y la inexistencia de gravámenes,
          embargos o inhibiciones que afecten la libre disposición del mismo. EL COMPRADOR
          asume desde la fecha del presente la responsabilidad civil derivada del uso del
          rodado, comprometiéndose a contratar el seguro obligatorio correspondiente.
        </LegalParagraph>
        <LegalParagraph>
          Las partes constituyen domicilios especiales en los indicados ut supra, sometiéndose
          a la jurisdicción de los Tribunales Ordinarios competentes con renuncia expresa a
          cualquier otro fuero.
        </LegalParagraph>

        <SignatureRow>
          <SignatureBlock
            rol="EL COMPRADOR"
            nombre={clienteFullName(cliente)}
            documento={`${cliente.documento_tipo}: ${cliente.documento_numero}`}
          />
          <SignatureBlock
            rol="POR LA VENDEDORA"
            nombre={empresa.razon_social.toUpperCase()}
            documento="Sello y firma autorizada"
          />
        </SignatureRow>

        <SviFooter />
      </Page>
    </Document>
  );
}
