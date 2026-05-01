# Panel Secretaria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el panel de secretaria dentro del admin existente con sidebar role-adaptive, dashboard del día, Kanban de asignaciones y vista de agenda por vendedor.

**Architecture:** Mismo app admin (`apps/admin`), mismo layout `(dashboard)`. El `Sidebar` recibe `rol` como prop desde el server layout y renderiza nav diferente. No se crea route group separado. Las páginas nuevas viven en `app/(dashboard)/secretaria/*`. Las queries propias del panel viven en `modules/secretaria/queries.ts`. La action de asignación de lead ya existe en `leads/actions.ts` y se reutiliza directamente.

**Tech Stack:** Next.js 15 App Router · Supabase SSR · Drizzle-agnostic (queries directas vía supabase-js) · Tailwind v4 con tokens `svi-*` · Lucide icons · Server components + client components mínimos

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modify | `packages/utils/src/auth/permissions.ts` | +5 permisos nuevos |
| Modify | `apps/admin/src/modules/leads/actions.ts` | Agregar assertCan a asignarVendedor |
| Modify | `apps/admin/src/components/layout/sidebar.tsx` | Nav por rol vía getNavByRol() |
| Modify | `apps/admin/src/app/(dashboard)/layout.tsx` | Pasar rol a Sidebar |
| Create | `apps/admin/src/modules/secretaria/queries.ts` | getDashboardDia, getLeadsParaAsignacion, getAgendaVendedores |
| Create | `apps/admin/src/app/(dashboard)/secretaria/page.tsx` | Dashboard del día |
| Create | `apps/admin/src/app/(dashboard)/secretaria/asignaciones/page.tsx` | Kanban leads→vendedores (server shell) |
| Create | `apps/admin/src/app/(dashboard)/secretaria/asignaciones/asignar-card.tsx` | Card cliente con selector de vendedor (client) |
| Create | `apps/admin/src/app/(dashboard)/secretaria/vendedores/page.tsx` | Agenda por vendedor |

---

## Task 1: Permisos RBAC

**Files:**
- Modify: `packages/utils/src/auth/permissions.ts`
- Modify: `apps/admin/src/modules/leads/actions.ts`

- [ ] **Agregar permisos en permissions.ts**

Abrir `packages/utils/src/auth/permissions.ts` y agregar al objeto `PERMISSIONS` después de `"config.integraciones"`:

```typescript
  "secretaria.dashboard":   ["super_admin", "admin", "gerente", "secretaria"],
  "agenda.view":            ["super_admin", "admin", "gerente", "vendedor", "secretaria"],
  "agenda.crear_turno":     ["super_admin", "admin", "gerente", "secretaria"],
  "agenda.gestionar_turno": ["super_admin", "admin", "gerente", "secretaria"],
  "leads.assign":           ["super_admin", "admin", "gerente", "secretaria"],
```

El tipo `Permission` se actualiza automáticamente (es `keyof typeof PERMISSIONS`).

- [ ] **Agregar check de permiso en asignarVendedor**

En `apps/admin/src/modules/leads/actions.ts`, el import actual es:
```typescript
import { getSviClaims } from "@/lib/auth/claims";
```

Agregar al inicio de `asignarVendedor`, después de `safeParse`:

```typescript
export async function asignarVendedor(
  input: LeadAsignarInput,
): Promise<ActionResult> {
  const parsed = leadAsignarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const claims = await getSviClaims();
  if (!claims) return { ok: false, error: "No autenticado" };

  const { assertCan } = await import("@repo/utils");
  try {
    assertCan("leads.assign", claims.rol);
  } catch {
    return { ok: false, error: "Sin permiso para asignar leads" };
  }

  const supabase = await createClient();
  // ... resto igual
```

- [ ] **Verificar tipos**

```bash
npm run check-types 2>&1 | head -30
```

Esperado: sin errores nuevos (puede haber warnings preexistentes).

- [ ] **Commit**

```bash
git add packages/utils/src/auth/permissions.ts apps/admin/src/modules/leads/actions.ts
git commit -m "feat(F7.8): permisos RBAC secretaria + assertCan en asignarVendedor"
```

---

## Task 2: Sidebar role-adaptive

**Files:**
- Modify: `apps/admin/src/components/layout/sidebar.tsx`
- Modify: `apps/admin/src/app/(dashboard)/layout.tsx`

- [ ] **Reescribir sidebar.tsx**

Reemplazar el contenido completo de `apps/admin/src/components/layout/sidebar.tsx`:

```typescript
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
```

- [ ] **Pasar rol al Sidebar en layout.tsx**

En `apps/admin/src/app/(dashboard)/layout.tsx`, reemplazar `<Sidebar />` por:

```typescript
<Sidebar rol={appMeta.rol} />
```

La variable `appMeta` ya existe en el layout (`const appMeta = (user?.app_metadata ?? {}) as { rol?: string }`).

- [ ] **Verificar build**

```bash
npm run check-types 2>&1 | grep -E "error TS" | head -20
```

Esperado: sin errores nuevos.

- [ ] **Commit**

```bash
git add apps/admin/src/components/layout/sidebar.tsx apps/admin/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(F7.8): sidebar role-adaptive — nav secretaria vs nav completa"
```

---

## Task 3: Módulo secretaria — queries

**Files:**
- Create: `apps/admin/src/modules/secretaria/queries.ts`

- [ ] **Crear queries.ts**

Crear `apps/admin/src/modules/secretaria/queries.ts`:

```typescript
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSviClaims } from "@/lib/auth/claims";
import type { Turno } from "@/modules/agenda/queries";
import type { LeadRow } from "@/modules/leads/queries";

// ─── Tipos propios ───────────────────────────────────────────────────���────────

export interface DashboardDiaData {
  turnosProximos: Turno[];
  turnosHoyCount: number;
  pendientesConfirmarCount: number;
  leadsSinAsignarCount: number;
}

export interface VendedorConTurnos {
  recurso_id: string;
  nombre: string;
  color: string;
  turnosHoy: number;
  turnosSemana: number;
  turnos: Turno[];
}

export interface LeadAsignacion {
  sinAsignar: LeadRow[];
  porVendedor: Record<string, LeadRow[]>;
  vendedores: { id: string; nombre: string; color: string }[];
}

// ─── Helper: mapea fila raw de agenda_turnos a Turno ─────────────────���───────

function mapTurnoRow(r: Record<string, unknown>): Turno {
  const recurso = Array.isArray(r.recurso)
    ? (r.recurso[0] as { nombre: string; color: string } | undefined)
    : (r.recurso as { nombre: string; color: string } | null | undefined);
  return {
    ...(r as unknown as Turno),
    recurso_nombre: recurso?.nombre ?? null,
    recurso_color: recurso?.color ?? null,
    persona_label:
      r.persona_tipo === "externo"
        ? ((r.externo_nombre as string | null) ?? "Externo")
        : ((r.persona_tipo as string) ?? null),
    recurso: undefined,
  };
}

const TURNO_SELECT = `
  id, empresa_id, recurso_id, persona_tipo, persona_id, externo_nombre,
  externo_telefono, inicio, fin, estado, modalidad, motivo, notas,
  creado_por, external_ref, cancelado_motivo, cancelado_at, cancelado_por, created_at,
  recurso:agenda_recursos!agenda_turnos_recurso_id_fkey ( nombre, color )
`;

// ─── getDashboardDia ──────────────────────────────────────────────────────────

export async function getDashboardDia(): Promise<DashboardDiaData> {
  const claims = await getSviClaims();
  if (!claims) {
    return {
      turnosProximos: [],
      turnosHoyCount: 0,
      pendientesConfirmarCount: 0,
      leadsSinAsignarCount: 0,
    };
  }

  const supabase = await createClient();
  const now = new Date();
  const hoy = now.toISOString().slice(0, 10)!;
  const en3h = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

  const [proximosRes, hoyCountRes, pendientesRes, leadsSARes] = await Promise.all([
    supabase
      .from("agenda_turnos")
      .select(TURNO_SELECT)
      .eq("empresa_id", claims.empresa_id)
      .in("estado", ["solicitado", "confirmado"])
      .gte("inicio", now.toISOString())
      .lte("inicio", en3h)
      .order("inicio")
      .limit(10),

    supabase
      .from("agenda_turnos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", claims.empresa_id)
      .gte("inicio", `${hoy}T00:00:00`)
      .lte("inicio", `${hoy}T23:59:59`),

    supabase
      .from("agenda_turnos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", claims.empresa_id)
      .eq("estado", "solicitado"),

    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("vendedor_id", null)
      .not("estado", "in", "(ganado,perdido)"),
  ]);

  return {
    turnosProximos: ((proximosRes.data ?? []) as Record<string, unknown>[]).map(mapTurnoRow),
    turnosHoyCount: hoyCountRes.count ?? 0,
    pendientesConfirmarCount: pendientesRes.count ?? 0,
    leadsSinAsignarCount: leadsSARes.count ?? 0,
  };
}

// ─── getLeadsParaAsignacion ───────────────────────────────────────────────────

export async function getLeadsParaAsignacion(): Promise<LeadAsignacion> {
  const claims = await getSviClaims();
  if (!claims) return { sinAsignar: [], porVendedor: {}, vendedores: [] };

  const supabase = await createClient();

  const [leadsRes, vendedoresRes] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nombre, email, telefono, mensaje, estado, vehiculo_interes, vendedor_id, sucursal_id, origen, created_at, updated_at",
      )
      .not("estado", "in", "(ganado,perdido)")
      .order("updated_at", { ascending: false }),

    supabase
      .from("agenda_recursos")
      .select("id, nombre, color")
      .eq("empresa_id", claims.empresa_id)
      .eq("tipo", "vendedor")
      .eq("activo", true)
      .is("deleted_at", null)
      .order("nombre"),
  ]);

  const leads = (leadsRes.data ?? []) as LeadRow[];
  const vendedores = (vendedoresRes.data ?? []) as { id: string; nombre: string; color: string }[];

  const sinAsignar: LeadRow[] = [];
  const porVendedor: Record<string, LeadRow[]> = {};
  for (const v of vendedores) porVendedor[v.id] = [];

  for (const lead of leads) {
    if (!lead.vendedor_id || !(lead.vendedor_id in porVendedor)) {
      sinAsignar.push(lead);
    } else {
      porVendedor[lead.vendedor_id]!.push(lead);
    }
  }

  return { sinAsignar, porVendedor, vendedores };
}

// ─── getAgendaVendedores ──────────────────────────────────────────────────────

export async function getAgendaVendedores(opts: {
  desde: string;
  hasta: string;
}): Promise<VendedorConTurnos[]> {
  const claims = await getSviClaims();
  if (!claims) return [];

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10)!;

  const [recursosRes, turnosRes] = await Promise.all([
    supabase
      .from("agenda_recursos")
      .select("id, nombre, color")
      .eq("empresa_id", claims.empresa_id)
      .eq("tipo", "vendedor")
      .eq("activo", true)
      .is("deleted_at", null)
      .order("nombre"),

    supabase
      .from("agenda_turnos")
      .select(TURNO_SELECT)
      .eq("empresa_id", claims.empresa_id)
      .gte("inicio", opts.desde)
      .lt("inicio", opts.hasta)
      .order("inicio"),
  ]);

  const vendedores = (recursosRes.data ?? []) as {
    id: string;
    nombre: string;
    color: string;
  }[];
  const todasFilas = (turnosRes.data ?? []) as Record<string, unknown>[];

  return vendedores.map((v) => {
    const turnos = todasFilas
      .filter((r) => r.recurso_id === v.id)
      .map(mapTurnoRow);

    const turnosHoy = turnos.filter(
      (t) =>
        t.inicio >= `${hoy}T00:00:00` && t.inicio <= `${hoy}T23:59:59`,
    ).length;

    return {
      recurso_id: v.id,
      nombre: v.nombre,
      color: v.color,
      turnosHoy,
      turnosSemana: turnos.length,
      turnos,
    };
  });
}
```

- [ ] **Verificar tipos**

```bash
npm run check-types 2>&1 | grep -E "error TS" | head -20
```

Esperado: sin errores nuevos.

- [ ] **Commit**

```bash
git add apps/admin/src/modules/secretaria/
git commit -m "feat(F7.8): módulo secretaria — queries getDashboardDia, getLeadsParaAsignacion, getAgendaVendedores"
```

---

## Task 4: Página /secretaria — Dashboard del día

**Files:**
- Create: `apps/admin/src/app/(dashboard)/secretaria/page.tsx`

- [ ] **Crear page.tsx**

Crear `apps/admin/src/app/(dashboard)/secretaria/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Video,
  Phone,
  MapPin,
} from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getDashboardDia } from "@/modules/secretaria/queries";
export const metadata = { title: "Secretaria — SVI ERP" };

const MODALIDAD_ICON = {
  presencial: MapPin,
  videollamada: Video,
  telefono: Phone,
} as const;

export default async function SecretariaPage() {
  const claims = await getSviClaims();
  if (!claims || !can("secretaria.dashboard", claims.rol)) redirect("/dashboard");

  const data = await getDashboardDia();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-svi-white">Inicio</h1>
          <p className="text-sm text-svi-muted mt-0.5">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Link
          href="/agenda/turnos/nuevo"
          className="flex items-center gap-2 bg-svi-gold text-svi-black text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Nuevo turno
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="h-5 w-5 text-svi-gold" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Turnos hoy</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.turnosHoyCount}</p>
        </div>
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-svi-warning" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Por confirmar</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.pendientesConfirmarCount}</p>
        </div>
        <div className="bg-svi-card rounded-xl p-5 border border-svi-border-muted">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-svi-info" />
            <span className="text-xs text-svi-muted uppercase tracking-wider font-mono">Leads sin asignar</span>
          </div>
          <p className="text-3xl font-bold text-svi-white">{data.leadsSinAsignarCount}</p>
        </div>
      </div>

      {/* Próximos turnos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-svi-muted uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Próximas 3 horas
          </h2>
          <Link href="/agenda" className="text-xs text-svi-gold hover:underline">
            Ver agenda completa →
          </Link>
        </div>

        {data.turnosProximos.length === 0 ? (
          <div className="bg-svi-card rounded-xl p-8 border border-svi-border-muted text-center">
            <CheckCircle2 className="h-8 w-8 text-svi-success mx-auto mb-2 opacity-50" />
            <p className="text-sm text-svi-muted">Sin turnos en las próximas 3 horas</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.turnosProximos.map((turno) => {
              const ModalidadIcon = MODALIDAD_ICON[turno.modalidad] ?? MapPin;
              const hora = new Date(turno.inicio).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={turno.id}
                  className="bg-svi-card rounded-xl p-4 border border-svi-border-muted flex items-center gap-4"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: turno.recurso_color ?? "#C5A059" }}
                  />
                  <div className="text-center shrink-0 w-12">
                    <p className="text-lg font-bold text-svi-white">{hora}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-svi-white truncate">
                      {turno.persona_label ?? "—"}
                    </p>
                    <p className="text-xs text-svi-muted truncate">{turno.motivo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ModalidadIcon className="h-3.5 w-3.5 text-svi-muted" />
                    <span className="text-xs text-svi-muted">{turno.recurso_nombre}</span>
                  </div>
                  <Link
                    href={`/agenda/turnos/${turno.id}`}
                    className="text-xs text-svi-gold hover:underline shrink-0"
                  >
                    Ver
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="text-sm font-medium text-svi-muted uppercase tracking-wider font-mono mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/secretaria/asignaciones"
            className="bg-svi-card rounded-xl p-4 border border-svi-border-muted hover:border-svi-gold transition-colors flex items-center gap-3"
          >
            <Users className="h-5 w-5 text-svi-gold" />
            <div>
              <p className="text-sm font-medium text-svi-white">Asignaciones</p>
              <p className="text-xs text-svi-muted">
                {data.leadsSinAsignarCount} sin asignar
              </p>
            </div>
          </Link>
          <Link
            href="/secretaria/vendedores"
            className="bg-svi-card rounded-xl p-4 border border-svi-border-muted hover:border-svi-gold transition-colors flex items-center gap-3"
          >
            <CalendarDays className="h-5 w-5 text-svi-info" />
            <div>
              <p className="text-sm font-medium text-svi-white">Agenda vendedores</p>
              <p className="text-xs text-svi-muted">Vista por recurso</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Verificar tipos y build**

```bash
npm run check-types 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/\(dashboard\)/secretaria/
git commit -m "feat(F7.8): /secretaria — dashboard del día con KPIs y próximos turnos"
```

---

## Task 5: Página /secretaria/asignaciones — Kanban

**Files:**
- Create: `apps/admin/src/app/(dashboard)/secretaria/asignaciones/page.tsx`
- Create: `apps/admin/src/app/(dashboard)/secretaria/asignaciones/asignar-card.tsx`

- [ ] **Crear asignar-card.tsx (client component)**

Crear `apps/admin/src/app/(dashboard)/secretaria/asignaciones/asignar-card.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { User, Phone, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { asignarVendedor } from "@/modules/leads/actions";
import type { LeadRow } from "@/modules/leads/queries";

interface Vendedor {
  id: string;
  nombre: string;
  color: string;
}

interface AsignarCardProps {
  lead: LeadRow;
  vendedores: Vendedor[];
}

export function AsignarCard({ lead, vendedores }: AsignarCardProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleAsignar(vendedorId: string | null) {
    startTransition(async () => {
      const res = await asignarVendedor({ id: lead.id, vendedor_id: vendedorId });
      if (res.ok) {
        toast.success(
          vendedorId
            ? `Lead asignado correctamente`
            : "Lead desasignado",
        );
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const vendedorActual = vendedores.find((v) => v.id === lead.vendedor_id);

  return (
    <div className="bg-svi-elevated rounded-lg p-3 border border-svi-border-muted space-y-2">
      {/* Nombre */}
      <div className="flex items-start gap-2">
        <User className="h-4 w-4 text-svi-muted mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-svi-white leading-tight">
          {lead.nombre ?? "Sin nombre"}
        </p>
      </div>

      {/* Teléfono */}
      {lead.telefono && (
        <a
          href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-svi-muted hover:text-svi-white transition-colors"
        >
          <Phone className="h-3 w-3" />
          {lead.telefono}
        </a>
      )}

      {/* Origen */}
      {lead.origen && (
        <p className="text-xs text-svi-muted">
          Origen: <span className="text-svi-white">{lead.origen}</span>
        </p>
      )}

      {/* Selector de vendedor */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={isPending}
          className="w-full flex items-center justify-between gap-2 bg-svi-card rounded-md px-3 py-1.5 text-xs border border-svi-border-muted hover:border-svi-gold transition-colors disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {vendedorActual ? (
              <>
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: vendedorActual.color }}
                />
                <span className="text-svi-white">{vendedorActual.nombre}</span>
              </>
            ) : (
              <span className="text-svi-muted">Sin asignar</span>
            )}
          </span>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-svi-muted" />
          ) : (
            <ChevronDown className="h-3 w-3 text-svi-muted" />
          )}
        </button>

        {open && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-svi-card border border-svi-border-muted rounded-md shadow-lg overflow-hidden">
            <li>
              <button
                type="button"
                onClick={() => handleAsignar(null)}
                className="w-full text-left px-3 py-2 text-xs text-svi-muted hover:bg-svi-elevated hover:text-svi-white transition-colors"
              >
                Sin asignar
              </button>
            </li>
            {vendedores.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handleAsignar(v.id)}
                  className="w-full text-left px-3 py-2 text-xs text-svi-white hover:bg-svi-elevated transition-colors flex items-center gap-2"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: v.color }}
                  />
                  {v.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Agendar turno */}
      <a
        href={`/agenda/turnos/nuevo?persona_id=${lead.id}&persona_tipo=lead`}
        className="block text-center text-xs text-svi-gold hover:underline pt-1"
      >
        + Agendar turno
      </a>
    </div>
  );
}
```

- [ ] **Crear page.tsx**

Crear `apps/admin/src/app/(dashboard)/secretaria/asignaciones/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getLeadsParaAsignacion } from "@/modules/secretaria/queries";
import { AsignarCard } from "./asignar-card";

export const metadata = { title: "Asignaciones — SVI ERP" };

export default async function AsignacionesPage() {
  const claims = await getSviClaims();
  if (!claims || !can("leads.assign", claims.rol)) redirect("/secretaria");

  const { sinAsignar, porVendedor, vendedores } = await getLeadsParaAsignacion();

  const columns = [
    { id: "sin-asignar", label: "Sin asignar", leads: sinAsignar, color: "#6B7280" },
    ...vendedores.map((v) => ({
      id: v.id,
      label: v.nombre,
      leads: porVendedor[v.id] ?? [],
      color: v.color,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-svi-white">Asignaciones</h1>
        <p className="text-sm text-svi-muted mt-0.5">
          Asignación de leads a vendedores
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="w-64 shrink-0">
            {/* Header columna */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <h3 className="text-sm font-medium text-svi-white">{col.label}</h3>
              <span className="ml-auto text-xs text-svi-muted bg-svi-elevated rounded-full px-2 py-0.5">
                {col.leads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px]">
              {col.leads.length === 0 ? (
                <div className="border border-dashed border-svi-border-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-svi-muted">Sin leads</p>
                </div>
              ) : (
                col.leads.map((lead) => (
                  <AsignarCard
                    key={lead.id}
                    lead={lead}
                    vendedores={vendedores}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Verificar tipos**

```bash
npm run check-types 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/\(dashboard\)/secretaria/asignaciones/
git commit -m "feat(F7.8): /secretaria/asignaciones — kanban leads por vendedor con asignación inline"
```

---

## Task 6: Página /secretaria/vendedores

**Files:**
- Create: `apps/admin/src/app/(dashboard)/secretaria/vendedores/page.tsx`

- [ ] **Crear page.tsx**

Crear `apps/admin/src/app/(dashboard)/secretaria/vendedores/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { getSviClaims } from "@/lib/auth/claims";
import { can } from "@repo/utils";
import { getAgendaVendedores } from "@/modules/secretaria/queries";

export const metadata = { title: "Vendedores — SVI ERP" };

const ESTADO_COLORS: Record<string, string> = {
  solicitado: "text-svi-warning bg-svi-warning/10",
  confirmado: "text-svi-info bg-svi-info/10",
  cumplido: "text-svi-success bg-svi-success/10",
  cancelado: "text-svi-error bg-svi-error/10",
  no_show: "text-svi-muted bg-svi-elevated",
};

const ESTADO_LABELS: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
  no_show: "No se presentó",
};

export default async function VendedoresPage() {
  const claims = await getSviClaims();
  if (!claims || !can("agenda.view", claims.rol)) redirect("/secretaria");

  const hoy = new Date().toISOString().slice(0, 10)!;
  const lunesProximo = new Date();
  lunesProximo.setDate(lunesProximo.getDate() + 7);

  const vendedores = await getAgendaVendedores({
    desde: `${hoy}T00:00:00`,
    hasta: lunesProximo.toISOString(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-svi-white">Vendedores</h1>
        <p className="text-sm text-svi-muted mt-0.5">Agenda por vendedor — hoy y próximos 7 días</p>
      </div>

      {vendedores.length === 0 ? (
        <div className="bg-svi-card rounded-xl p-12 border border-svi-border-muted text-center">
          <CalendarDays className="h-10 w-10 text-svi-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-svi-muted">
            No hay recursos de tipo vendedor activos.{" "}
            <Link href="/agenda/recursos" className="text-svi-gold hover:underline">
              Ir a Recursos
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendedores.map((v) => (
            <div
              key={v.recurso_id}
              className="bg-svi-card rounded-xl border border-svi-border-muted overflow-hidden"
            >
              {/* Header vendedor */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-svi-border-muted">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: v.color }}
                />
                <h3 className="text-sm font-semibold text-svi-white">{v.nombre}</h3>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-xs text-svi-muted">
                    Hoy: <span className="text-svi-white font-medium">{v.turnosHoy}</span>
                  </span>
                  <span className="text-xs text-svi-muted">
                    Semana: <span className="text-svi-white font-medium">{v.turnosSemana}</span>
                  </span>
                </div>
              </div>

              {/* Turnos */}
              {v.turnos.length === 0 ? (
                <div className="px-5 py-6 flex items-center gap-2 text-svi-muted">
                  <CheckCircle2 className="h-4 w-4 opacity-40" />
                  <p className="text-xs">Sin turnos en el período</p>
                </div>
              ) : (
                <ul className="divide-y divide-svi-border-muted">
                  {v.turnos.map((t) => {
                    const fecha = new Date(t.inicio).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    const hora = new Date(t.inicio).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="text-xs text-svi-muted w-28 shrink-0">
                          <span className="capitalize">{fecha}</span>
                          {" · "}
                          <span className="text-svi-white font-medium">{hora}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-svi-white truncate">
                            {t.persona_label ?? "—"}
                          </p>
                          <p className="text-xs text-svi-muted truncate">{t.motivo}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[t.estado] ?? "text-svi-muted"}`}
                        >
                          {ESTADO_LABELS[t.estado] ?? t.estado}
                        </span>
                        <Link
                          href={`/agenda/turnos/${t.id}`}
                          className="text-xs text-svi-gold hover:underline shrink-0"
                        >
                          Ver
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Verificar build completo**

```bash
npm run check-types 2>&1 | grep -E "error TS" | head -30
```

Esperado: sin errores nuevos.

- [ ] **Commit final**

```bash
git add apps/admin/src/app/\(dashboard\)/secretaria/vendedores/
git commit -m "feat(F7.8): /secretaria/vendedores — agenda por vendedor con turnos de la semana"
```

---

## Task 7: Verificación end-to-end y commit de cierre

- [ ] **Levantar dev y verificar**

```bash
npm run dev
```

Verificar en navegador (`http://localhost:3001`):

1. Login con rol `admin` → sidebar sin cambios (nav completa)
2. Login con rol `secretaria` → sidebar muestra solo 5 items (Inicio, Agenda, Asignaciones, Vendedores, Clientes)
3. `/secretaria` carga con KPIs reales
4. `/secretaria/asignaciones` muestra columnas con leads
5. Asignar lead a vendedor → cambia de columna tras reload
6. `/secretaria/vendedores` muestra lista de vendedores con turnos
7. Link "Agendar turno" en asignar-card lleva a `/agenda/turnos/nuevo`
8. Un usuario `secretaria` que intenta ir a `/inversiones` → no ve datos (RLS)

- [ ] **Commit tag F7.8**

```bash
git add .
git commit -m "feat(F7.8): Panel Secretaria — sidebar role-adaptive + dashboard + kanban + vendedores"
```

---

## Criterios de éxito

- [ ] Sidebar adapta nav según `rol` del JWT — sin duplicar layout
- [ ] `/secretaria` muestra datos reales del día
- [ ] Asignación de lead persiste en DB y se refleja en kanban
- [ ] Secretaria puede navegar a `/agenda` y crear turno
- [ ] Secretaria NO ve inversiones, caja ni configuración en el sidebar
- [ ] Types sin errores nuevos (`npm run check-types`)
