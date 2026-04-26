"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@repo/ui";
import { SucursalSwitcher } from "./sucursal-switcher";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  user: { email?: string | null; nombre?: string | null; rol?: string | null };
  sucursales: { id: string; nombre: string; codigo: string }[];
}

export function Topbar({ user, sucursales }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-svi-border-muted bg-svi-dark/80 backdrop-blur-xl">
      <div className="h-full px-4 md:px-6 flex items-center gap-4">
        <SucursalSwitcher sucursales={sucursales} />

        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
          <Input
            type="search"
            placeholder="Buscar (Cmd + K)"
            className="pl-10 bg-svi-card"
            aria-label="Buscar"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-svi-red" />
          </button>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
