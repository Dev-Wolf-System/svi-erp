import Link from "next/link";
import { Mail, Phone, Instagram, Facebook } from "lucide-react";
import { Logo } from "@repo/ui";
import { APP_LONG_NAME } from "@repo/config/constants";

const navGroups = [
  {
    title: "Empresa",
    links: [
      { label: "Catálogo", href: "#catalogo" },
      { label: "Sistema de inversión", href: "#inversion" },
      { label: "Sucursales", href: "#sucursales" },
    ],
  },
  {
    title: "Acceso privado",
    links: [
      { label: "Portal cliente", href: "/portal/cliente" },
      { label: "Portal inversor", href: "/portal/inversor" },
      { label: "Ingreso interno", href: process.env.NEXT_PUBLIC_ADMIN_URL ?? "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Aviso de privacidad", href: "/legal/privacidad" },
      { label: "Términos y condiciones", href: "/legal/terminos" },
      { label: "Defensa al consumidor", href: "https://www.argentina.gob.ar/defensadelconsumidor" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      id="contacto"
      className="border-t border-svi-border-muted bg-svi-dark"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo size="lg" />
            <p className="mt-5 text-sm text-svi-muted-2 max-w-md leading-relaxed">
              {APP_LONG_NAME}. Concesionaria multisucursal premium en Tucumán.
              Vehículos 0KM y usados, financiación bancaria, sistema de inversión.
            </p>
            <div className="mt-6 space-y-2 text-sm text-svi-muted-2">
              <a href="mailto:contacto@svi.com.ar" className="inline-flex items-center gap-2 hover:text-svi-gold">
                <Mail className="h-4 w-4" /> contacto@svi.com.ar
              </a>
              <a href="tel:+543865555000" className="block inline-flex items-center gap-2 hover:text-svi-gold">
                <Phone className="h-4 w-4" /> +54 9 3865 555-0000
              </a>
            </div>
            <div className="mt-6 flex gap-3">
              <SocialLink href="#" icon={Instagram} label="Instagram" />
              <SocialLink href="#" icon={Facebook} label="Facebook" />
            </div>
          </div>

          {navGroups.map((g) => (
            <div key={g.title} className="md:col-span-2">
              <h4 className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
                {g.title}
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-svi-muted hover:text-svi-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-svi-border-muted flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <p className="text-xs text-svi-muted-2">
            © {year} {APP_LONG_NAME}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-svi-muted-2 font-mono">
            Datos personales protegidos por Ley 25.326. CUIT 30-71234567-8.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: typeof Mail; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-svi-border-muted text-svi-muted hover:text-svi-gold hover:border-svi-gold/40 transition-colors"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}
