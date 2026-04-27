import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, JetBrains_Mono } from "next/font/google";
import { APP_LONG_NAME } from "@repo/config/constants";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${APP_LONG_NAME} | Concesionaria Premium en Tucumán`,
    template: `%s · ${APP_LONG_NAME}`,
  },
  description:
    "Concesionaria multisucursal en Tucumán. Vehículos 0KM y usados de gama media a alta. Sistema de inversión con rendimientos mensuales. Aguilares, Concepción y San Miguel de Tucumán.",
  keywords: [
    "concesionaria tucumán",
    "autos 0km aguilares",
    "autos usados tucumán",
    "invertir vehículos tucumán",
    "financiación autos tucumán",
    "autos premium",
    "SVI",
    "Solo Vehículos Impecables",
  ],
  authors: [{ name: APP_LONG_NAME }],
  creator: APP_LONG_NAME,
  publisher: APP_LONG_NAME,
  category: "automotive",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: APP_LONG_NAME,
    title: `${APP_LONG_NAME} — Vehículos que definen un estilo`,
    description:
      "Vehículos premium 0KM y usados, financiación a medida y sistema de inversión con rendimientos. 3 sucursales en Tucumán.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: APP_LONG_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_LONG_NAME,
    description: "Vehículos premium e inversión con rendimientos en Tucumán.",
    images: ["/og-image.jpg"],
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${inter.variable} ${jetbrains.variable} dark`}
    >
      <body className="font-body bg-svi-black text-svi-white antialiased">
        {children}

        {/* JSON-LD: AutoDealer schema para SEO local */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AutoDealer",
              name: APP_LONG_NAME,
              description:
                "Concesionaria multisucursal en Tucumán con vehículos 0KM, usados e inversión.",
              url: process.env.NEXT_PUBLIC_APP_URL,
              telephone: "+54 9 3865 555-0001",
              areaServed: { "@type": "AdministrativeArea", name: "Tucumán" },
              priceRange: "$$ - $$$$",
              address: [
                { "@type": "PostalAddress", addressLocality: "Aguilares", addressRegion: "Tucumán", addressCountry: "AR" },
                { "@type": "PostalAddress", addressLocality: "Concepción", addressRegion: "Tucumán", addressCountry: "AR" },
                { "@type": "PostalAddress", addressLocality: "San Miguel de Tucumán", addressRegion: "Tucumán", addressCountry: "AR" },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
