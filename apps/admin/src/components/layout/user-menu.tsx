"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@repo/utils";

interface Props {
  user: { email?: string | null; nombre?: string | null; rol?: string | null };
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initials = (user.nombre ?? user.email ?? "U").slice(0, 2).toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-svi-elevated transition-colors"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-svi-red text-svi-white text-xs font-bold font-mono">
          {initials}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-svi-muted-2 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 w-64 z-20 rounded-lg border border-svi-border-muted bg-svi-card shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-svi-border-muted">
              <p className="text-sm text-svi-white font-medium">
                {user.nombre ?? "Usuario"}
              </p>
              <p className="text-xs text-svi-muted-2 truncate">{user.email}</p>
              {user.rol && (
                <p className="mt-1 inline-block text-[10px] font-mono uppercase tracking-widest text-svi-gold">
                  {user.rol}
                </p>
              )}
            </div>
            <ul className="py-1">
              <li>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-svi-muted hover:bg-svi-elevated"
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-svi-error hover:bg-svi-error/10"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
