import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, JetBrains_Mono } from "next/font/google";
import { APP_LONG_NAME } from "@repo/config/constants";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
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

export const viewport: Viewport = { themeColor: "#0A0A0A" };

export const metadata: Metadata = {
  title: { default: `Panel · ${APP_LONG_NAME}`, template: `%s · Panel ${APP_LONG_NAME}` },
  description: "Sistema de gestión interno SVI",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-AR"
      className={`${montserrat.variable} ${inter.variable} ${jetbrains.variable} dark`}
    >
      <body className="font-body bg-svi-black text-svi-white antialiased">{children}</body>
    </html>
  );
}
