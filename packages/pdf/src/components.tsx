import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { SVI_COLORS, SVI_FONTS, SVI_SIZES } from "./theme";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: SVI_COLORS.gold,
  },
  brand: { flexDirection: "column" },
  brandName: {
    fontSize: SVI_SIZES.display,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.black,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: SVI_SIZES.base,
    fontFamily: SVI_FONTS.body,
    color: SVI_COLORS.textMuted,
    marginTop: 2,
  },
  brandMeta: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  brandMetaSucursal: {
    fontSize: SVI_SIZES.md,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.gold,
    marginBottom: 4,
  },
  brandMetaText: {
    fontSize: SVI_SIZES.sm,
    fontFamily: SVI_FONTS.body,
    color: SVI_COLORS.textMuted,
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: SVI_SIZES.lg,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.black,
    marginTop: 18,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: SVI_COLORS.gold,
    paddingBottom: 4,
  },

  dataRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "baseline",
  },
  dataLabel: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    width: 140,
    fontFamily: SVI_FONTS.body,
  },
  dataValue: {
    fontSize: SVI_SIZES.md,
    color: SVI_COLORS.black,
    fontFamily: SVI_FONTS.display,
    flex: 1,
  },

  highlightBox: {
    backgroundColor: SVI_COLORS.goldSoft,
    borderLeftWidth: 3,
    borderLeftColor: SVI_COLORS.red,
    padding: 12,
    marginVertical: 12,
    borderRadius: 4,
  },
  highlightValue: {
    fontSize: SVI_SIZES.hero,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.red,
    textAlign: "center",
  },
  highlightLabel: {
    fontSize: SVI_SIZES.base,
    color: SVI_COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },

  legalText: {
    fontSize: SVI_SIZES.sm,
    color: SVI_COLORS.textSubtle,
    lineHeight: 1.6,
    marginTop: 8,
    textAlign: "justify",
  },

  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 60,
  },
  signatureBox: { width: "40%", alignItems: "center" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#333333",
    width: "100%",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: SVI_SIZES.sm,
    color: SVI_COLORS.textMuted,
    textAlign: "center",
  },
  signatureName: {
    fontSize: SVI_SIZES.sm,
    color: SVI_COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    fontFamily: SVI_FONTS.display,
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: SVI_COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: SVI_SIZES.xs,
    color: "#AAAAAA",
    fontFamily: SVI_FONTS.body,
  },
  footerPageNum: {
    fontSize: SVI_SIZES.xs,
    color: SVI_COLORS.gold,
    fontFamily: SVI_FONTS.display,
  },
});

export interface SviHeaderProps {
  empresaNombre: string;
  empresaCuit: string;
  empresaTelefono?: string | null;
  empresaEmail?: string | null;
  sucursalNombre: string;
  sucursalDireccion?: string | null;
}

export function SviHeader(props: SviHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Text style={styles.brandName}>{props.empresaNombre}</Text>
        <Text style={styles.brandTagline}>Solo Vehículos Impecables</Text>
      </View>
      <View style={styles.brandMeta}>
        <Text style={styles.brandMetaSucursal}>{props.sucursalNombre}</Text>
        {props.sucursalDireccion ? (
          <Text style={styles.brandMetaText}>{props.sucursalDireccion}</Text>
        ) : null}
        <Text style={styles.brandMetaText}>CUIT: {props.empresaCuit}</Text>
        {props.empresaTelefono ? (
          <Text style={styles.brandMetaText}>Tel: {props.empresaTelefono}</Text>
        ) : null}
        {props.empresaEmail ? (
          <Text style={styles.brandMetaText}>{props.empresaEmail}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

export function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.highlightBox}>
      <Text style={styles.highlightValue}>{value}</Text>
      <Text style={styles.highlightLabel}>{label}</Text>
    </View>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <Text style={styles.legalText}>{children}</Text>;
}

export interface SignatureBlockProps {
  rol: string;
  nombre: string;
  documento?: string;
}

export function SignatureBlock(props: SignatureBlockProps) {
  return (
    <View style={styles.signatureBox}>
      <View style={styles.signatureLine} />
      <Text style={styles.signatureLabel}>{props.rol}</Text>
      <Text style={styles.signatureName}>{props.nombre}</Text>
      {props.documento ? (
        <Text style={styles.signatureLabel}>{props.documento}</Text>
      ) : null}
    </View>
  );
}

export function SignatureRow({ children }: { children: ReactNode }) {
  return <View style={styles.signatureArea}>{children}</View>;
}

export interface SviFooterProps {
  texto?: string;
}

export function SviFooter({ texto }: SviFooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {texto ?? "Solo Vehículos Impecables — Documento confidencial"}
      </Text>
      <Text
        style={styles.footerPageNum}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </View>
  );
}
