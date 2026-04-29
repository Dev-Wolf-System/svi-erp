import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { SVI_COLORS, SVI_FONTS, SVI_SIZES } from "./theme";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: SVI_COLORS.gold,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  brandTextBlock: { flexDirection: "column" },
  brandName: {
    fontSize: SVI_SIZES.display - 1,
    fontFamily: SVI_FONTS.display,
    color: SVI_COLORS.black,
    letterSpacing: 0.3,
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
    bottom: 24,
    left: 50,
    right: 50,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: SVI_COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: SVI_SIZES.xs,
    color: "#777777",
    fontFamily: SVI_FONTS.body,
  },
  footerCenter: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  footerHashLabel: {
    fontSize: 7,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: SVI_FONTS.body,
  },
  footerHash: {
    fontSize: SVI_SIZES.xs,
    color: SVI_COLORS.black,
    fontFamily: SVI_FONTS.display,
    letterSpacing: 0.5,
  },
  footerVerify: {
    fontSize: 7,
    color: "#999999",
    fontFamily: SVI_FONTS.body,
    marginTop: 1,
  },
  footerQr: {
    width: 36,
    height: 36,
  },
  footerLeft: { flexDirection: "column", maxWidth: 160 },
  footerRight: { flexDirection: "column", alignItems: "flex-end" },

  ejemplarBadge: {
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderRadius: 4,
    marginBottom: 14,
  },
  ejemplarBadgeOriginal: {
    borderColor: SVI_COLORS.gold,
    backgroundColor: SVI_COLORS.goldSoft,
  },
  ejemplarBadgeCopia: {
    borderColor: "#9A6E00",
    backgroundColor: "#FFF7E0",
  },
  ejemplarText: {
    fontSize: SVI_SIZES.sm,
    fontFamily: SVI_FONTS.display,
    letterSpacing: 2,
  },
  ejemplarTextOriginal: { color: SVI_COLORS.gold },
  ejemplarTextCopia: { color: "#9A6E00" },
  ejemplarSubtext: {
    fontSize: 7,
    color: SVI_COLORS.textMuted,
    fontFamily: SVI_FONTS.body,
    marginTop: 1,
    letterSpacing: 0.5,
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
  /** Logo data URL (image/jpeg base64). Si se omite, header sin logo. */
  logoDataUrl?: string | null;
}

export function SviHeader(props: SviHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        {props.logoDataUrl ? (
          <Image src={props.logoDataUrl} style={styles.brandLogo} />
        ) : null}
        <View style={styles.brandTextBlock}>
          <Text style={styles.brandName}>{props.empresaNombre}</Text>
          <Text style={styles.brandTagline}>Solo Vehículos Impecables</Text>
        </View>
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

export type TipoEjemplar = "ORIGINAL" | "COPIA";

export interface EjemplarBadgeProps {
  tipo: TipoEjemplar;
  /** Fecha de emisión del ejemplar (ISO o YYYY-MM-DD). Sólo se imprime para COPIA. */
  fechaEmision?: string;
}

/**
 * Sello visual en el documento que indica si es ORIGINAL o COPIA.
 * Pensado para colocarse después del header y antes del título — alineado
 * a la derecha. Inocuo para el cliente, importante para auditoría interna:
 *
 *   - ORIGINAL: dorado discreto, indica documento legal vigente.
 *   - COPIA: ambar suave + fecha de reemisión.
 */
export function EjemplarBadge({ tipo, fechaEmision }: EjemplarBadgeProps) {
  const isOriginal = tipo === "ORIGINAL";
  return (
    <View
      style={[
        styles.ejemplarBadge,
        isOriginal ? styles.ejemplarBadgeOriginal : styles.ejemplarBadgeCopia,
      ]}
    >
      <Text
        style={[
          styles.ejemplarText,
          isOriginal ? styles.ejemplarTextOriginal : styles.ejemplarTextCopia,
        ]}
      >
        {tipo}
      </Text>
      {!isOriginal && fechaEmision ? (
        <Text style={styles.ejemplarSubtext}>
          Reimpresa: {fechaEmision.slice(0, 10)}
        </Text>
      ) : null}
    </View>
  );
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

export interface SviIntegrityFooterProps {
  numeroOperacion: string;
  shortHash: string;
  fullHash: string;
  contratoVersion: number;
  qrDataUrl: string;
  verifyUrl: string;
  /** "ORIGINAL" o "COPIA" — se imprime al lado de la versión en cada página. */
  ejemplar?: TipoEjemplar;
}

/**
 * Footer fijo con sello de integridad: QR a la URL pública de verificación,
 * hash truncado y completo, número de operación, versión del documento y
 * marca ejemplar (ORIGINAL/COPIA). Se imprime en cada página (fixed).
 */
export function SviIntegrityFooter(props: SviIntegrityFooterProps) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerText}>
          {props.numeroOperacion} · v{props.contratoVersion}
          {props.ejemplar ? ` · ${props.ejemplar}` : ""}
        </Text>
        <Text style={styles.footerVerify}>Verificar: {props.verifyUrl}</Text>
      </View>
      <View style={styles.footerCenter}>
        <Text style={styles.footerHashLabel}>SHA-256</Text>
        <Text style={styles.footerHash}>{props.shortHash}</Text>
        <Text style={styles.footerVerify}>{props.fullHash.slice(0, 32)}…</Text>
      </View>
      <View style={styles.footerRight}>
        <Image src={props.qrDataUrl} style={styles.footerQr} />
        <Text
          style={styles.footerPageNum}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </View>
    </View>
  );
}
