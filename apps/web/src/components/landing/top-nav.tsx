"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo, Button } from "@repo/ui";
import { cn } from "@repo/utils";

const navItems = [
  { label: "Catálogo", href: "#catalogo" },
  { label: "Inversión", href: "#inversion" },
  { label: "Sucursales", href: "#sucursales" },
  { label: "Contacto", href: "#contacto" },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-svi-black/80 backdrop-blur-xl border-b border-svi-border-muted"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex h-16 md:h-20 items-center justify-between">
          <Link href="/" aria-label="Inicio" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>

          <ul className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm text-svi-muted hover:text-svi-gold transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/portal">
              <Button variant="ghost" size="sm">
                Portal
              </Button>
            </Link>
            <a href="#catalogo">
              <Button size="sm">
                Ver catálogo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>

          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-svi-border-muted text-svi-muted"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-svi-border-muted py-4 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-2 text-sm text-svi-muted hover:text-svi-gold"
              >
                {item.label}
              </a>
            ))}
            <Link href="/portal" className="block">
              <Button variant="secondary" className="w-full">
                Acceder al portal
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
