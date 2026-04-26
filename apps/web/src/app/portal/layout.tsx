import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@repo/ui";

export const metadata: Metadata = {
  title: "Portal SVI",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-svi-black">
      <header className="border-b border-svi-border-muted">
        <div className="mx-auto max-w-7xl px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>
          <Link
            href="/"
            className="text-sm text-svi-muted hover:text-svi-gold transition-colors"
          >
            Volver al sitio →
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
