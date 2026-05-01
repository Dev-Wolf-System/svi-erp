# Panel Secretaria — Spec de diseño
**Fecha:** 2026-05-01  
**Fase:** F7.8  
**Estado:** Aprobado

---

## Contexto

La secretaria de SVI necesita un panel propio dentro del admin (`app.svi.com.ar`) con acceso limitado a info sensible. Debe poder gestionar la agenda del owner, asignar consultas a vendedores, ver el estado de la agenda por recurso, y tener un tablero del día con lo más urgente.

---

## Arquitectura

### Enfoque: sidebar role-adaptive + rutas `/secretaria/*`

- Mismo app admin, mismo login, mismo layout `(dashboard)`
- El componente `Sidebar` recibe el rol desde el JWT y renderiza un `navItems` diferente
- No se crea un route group separado — reutiliza el layout existente
- La secretaria accede a `/agenda` (ya existe) para agendar turnos

### Qué ve la secretaria

| Nav item | Ruta | Permiso requerido |
|---|---|---|
| Inicio | `/secretaria` | `secretaria.dashboard` (nuevo) |
| Agenda | `/agenda` | `agenda.view` |
| Asignaciones | `/secretaria/asignaciones` | `leads.assign` |
| Vendedores | `/secretaria/vendedores` | `agenda.view` |
| Clientes | `/clientes` | `clientes.view` |

### Qué NO ve (oculto por rol en sidebar + RLS en DB)

Inversiones, Inversores, Liquidaciones, Solicitudes, Caja, Bancos, Reportes, Configuración.

---

## Permisos nuevos (`packages/utils/src/auth/permissions.ts`)

```ts
"secretaria.dashboard":     ["super_admin", "admin", "gerente", "secretaria"],
"agenda.view":              ["super_admin", "admin", "gerente", "vendedor", "secretaria"],
"agenda.crear_turno":       ["super_admin", "admin", "gerente", "secretaria"],
"agenda.gestionar_turno":   ["super_admin", "admin", "gerente", "secretaria"],
"leads.assign":             ["super_admin", "admin", "gerente", "secretaria"],
```

---

## Páginas

### `/secretaria` — Dashboard del día

**Datos que muestra:**
- KPIs: turnos hoy / pendientes de confirmar (`estado='solicitado'`) / leads sin asignar (`vendedor_id IS NULL`)
- Lista "Próximos turnos" (próximas 3h): persona, motivo, modalidad, estado, botón Confirmar
- Lista "Leads sin asignar": nombre, origen, teléfono WA link, botón asignar rápido (modal)
- Acceso directo "Nuevo turno"

**Implementación:** Server component, queries directas, sin estado cliente.

### `/secretaria/asignaciones` — Kanban leads→vendedores

**Columnas:** `Sin asignar` + una columna por cada vendedor activo (recurso tipo `vendedor`)  
**Cards:** nombre lead, origen, motivo consulta, teléfono, próximo turno (si tiene)  
**Acciones:**
- Click en card → drawer lateral con botones: Asignar a vendedor X / Agendar turno (link a `/agenda/turnos/nuevo?persona_id=xxx&persona_tipo=lead`)
- Server action `asignarLead(leadId, vendedorId)` con `assertCan('leads.assign')`

**Sin drag-drop por ahora** (HTML5 DnD o dnd-kit se agrega en iteración posterior si el usuario lo pide).

### `/secretaria/vendedores` — Agenda por vendedor

**Datos:** tabla con vendedores activos → turnos hoy / turnos semana / % ocupación del día  
**Expandible:** lista de turnos por vendedor con badge de estado  
**Fuente:** `agenda_turnos` JOIN `agenda_recursos` WHERE `recursos.tipo = 'vendedor'`

---

## Módulo backend

```
apps/admin/src/modules/secretaria/
  queries.ts
    getDashboardDia()          → KPIs + próximos turnos + leads sin asignar
    getLeadsSinAsignar()       → leads con vendedor_id IS NULL
    getAgendaVendedores(from, to) → turnos agrupados por vendedor
  actions.ts
    asignarLead(leadId, vendedorId) → UPDATE leads SET vendedor_id
```

---

## Sidebar

`sidebar.tsx` recibe `rol: Rol` como prop (desde el layout server component que lee el JWT).  
Exporta `getNavByRol(rol): NavGroup[]` — función pura, testeable.

Roles que ven el nav completo: `super_admin`, `admin`, `gerente`.  
Rol `secretaria`: nav reducido (solo los 5 items listados arriba).  
Otros roles (`vendedor`, `caja`, etc.): nav propio a definir cuando se implementen sus paneles.

---

## Lo que NO cambia

- Schema DB: sin nuevas migrations (leads ya tiene `vendedor_id`)
- Middleware de auth: sin cambios
- Página `/agenda` existente: sin cambios, la secretaria la usa tal cual
- RLS: `secretaria` no ve tablas de inversiones/caja (ya bloqueado por RLS existente)

---

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `packages/utils/src/auth/permissions.ts` | +5 permisos |
| `apps/admin/src/components/layout/sidebar.tsx` | nav por rol vía `getNavByRol()` |
| `apps/admin/src/app/(dashboard)/layout.tsx` | pasar `rol` al Sidebar |
| `apps/admin/src/modules/secretaria/queries.ts` | nuevo |
| `apps/admin/src/modules/secretaria/actions.ts` | nuevo |
| `apps/admin/src/app/(dashboard)/secretaria/page.tsx` | nuevo |
| `apps/admin/src/app/(dashboard)/secretaria/asignaciones/page.tsx` | nuevo |
| `apps/admin/src/app/(dashboard)/secretaria/vendedores/page.tsx` | nuevo |

---

## Criterios de éxito

- Login con rol `secretaria` → sidebar muestra solo los 5 items
- Login con rol `admin` → sidebar sin cambios
- `/secretaria` muestra tablero del día con datos reales
- Asignación de lead a vendedor persiste en DB
- Secretaria puede crear turno desde `/agenda/turnos/nuevo`
- Secretaria NO puede acceder a `/inversiones`, `/caja`, `/configuracion` (redirect 403)
