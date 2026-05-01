"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  ShoppingCart,
  Users,
  Kanban,
  TrendingUp,
  CircleDollarSign,
  Receipt,
  Inbox,
  Wallet,
  UserCog,
  Building2,
  BarChart3,
  CalendarDays,
  Settings,
  ClipboardList,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@repo/ui";
import { cn } from "@repo/utils";

interface NavGroup {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}

interface SidebarProps {
  rol?: string;
}

const FULL_NAV: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/stock", label: "Stock", icon: Car },
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/leads", label: "Leads", icon: Kanban },
      { href: "/inversores", label: "Inversores", icon: TrendingUp },
      { href: "/inversiones", label: "Inversiones", icon: CircleDollarSign },
      { href: "/liquidaciones", label: "Liquidaciones", icon: Receipt },
      { href: "/solicitudes-aporte", label: "Solicitudes", icon: Inbox },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/caja", label: "Caja", icon: Wallet },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/personal", label: "Personal", icon: UserCog },
      { href: "/bancos", label: "Bancos", icon: Building2 },
      { href: "/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const SECRETARIA_NAV: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/secretaria", label: "Inicio", icon: LayoutDashboard },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/secretaria/asignaciones", label: "Asignaciones", icon: ClipboardList },
      { href: "/secretaria/vendedores", label: "Vendedores", icon: Users2 },
      { href: "/clientes", label: "Clientes", icon: Users },
    ],
  },
];

/** Función pura — retorna la nav correcta según el rol. */
export function getNavByRol(rol: string | undefined): NavGroup[] {
  if (rol === "secretaria") return SECRETARIA_NAV;
  return FULL_NAV;
}

export function Sidebar({ rol }: SidebarProps) {
  const pathname = usePathname();
  const navGroups = getNavByRol(rol);

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 border-r border-svi-border-muted bg-svi-dark"
      aria-label="Navegación principal"
    >
      <div className="px-6 h-16 flex items-center border-b border-svi-border-muted">
        <Link href={rol === "secretaria" ? "/secretaria" : "/dashboard"} className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-xs text-svi-muted-2 font-mono uppercase tracking-widest">
            Panel
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 text-[10px] font-mono uppercase tracking-[0.25em] text-svi-muted-2 mb-2">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-svi-red text-svi-white"
                          : "text-svi-muted hover:bg-svi-elevated hover:text-svi-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-svi-border-muted text-xs text-svi-muted-2 font-mono">
        v0.1.0 · SVI ERP
      </div>
    </aside>
  );
}
