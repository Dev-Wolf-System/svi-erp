# SVI ERP/CRM — Solo Vehículos Impecables

Sistema de gestión empresarial multisucursal para concesionaria automotor.
Stack: **Next.js 15 + Supabase + Drizzle + Turborepo + Tailwind v4**.

> Plan maestro completo: `SVI_PLAN_MAESTRO_DEFINITIVO.md`
> Stack detallado: `STACK_TECNOLOGICO.md`
> Decisiones arquitectónicas: `docs/adr/`

---

## 🏗️ Estructura

```
svi-erp/
├── apps/
│   ├── web/              landing pública + portal extranet (cliente/inversor)
│   │                       :3000 → svi.com.ar (prod)
│   └── admin/            panel privado ERP/CRM
│                           :3001 → app.svi.com.ar (prod)
├── packages/
│   ├── ui/               design system compartido
│   ├── database/         Drizzle schema + clientes Supabase SSR
│   ├── config/           tokens Tailwind v4 (@theme) + constantes
│   ├── utils/            helpers (formato ARS/USD, RBAC, JWT types)
│   ├── integrations/     AFIP adapter (stub) + Mercado Pago + tests
│   ├── pdf/              @react-pdf/renderer · contrato venta SVI + tests
│   ├── eslint-config/    configs ESLint compartidas
│   └── typescript-config/ tsconfigs compartidos
├── supabase/
│   ├── migrations/       13 migraciones SQL versionadas
│   ├── seed/             datos demo
│   ├── _consolidated_schema.sql  todo en un archivo (para SQL Editor)
│   └── SETUP.md          guía operativa de inicialización
├── infra/
│   ├── Caddyfile         (legacy — reemplazado por Traefik labels en docker-compose.yml)
│   └── DEPLOY.md         guía de deploy en VPS (Traefik + redes externas)
├── docs/
│   ├── adr/              7 ADRs documentando decisiones técnicas
│   └── PRODUCTION_HARDENING.md  checklist pre-prod (12 secciones)
├── docker-compose.yml    Traefik labels + redes externas (n8n_evoapi, supabase_network)
└── scripts/dev-reset.sh  limpieza completa + reinicio dev
```

---

## 🚀 Quickstart local

### Pre-requisitos
- Node 20+
- npm 11+
- Supabase corriendo (local con `supabase start`, o self-hosted, o Cloud)

### Setup

```bash
# 1. Clonar e instalar (postinstall repara symlinks de bin si estás en WSL2)
git clone <repo> svi-erp && cd svi-erp
npm install

# 2. Configurar entorno
cp .env.example .env.local
# editar .env.local con las claves de tu Supabase
# además crear apps/web/.env.local y apps/admin/.env.local con las
# vars NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Aplicar el schema en Supabase (SQL Editor del Studio)
#    pegar todo el contenido de supabase/_consolidated_schema.sql
#    ver detalles en supabase/SETUP.md

# 4. Activar el JWT custom_access_token_hook
#    crítico — sin esto las RLS devuelven 0 filas
#    ver supabase/SETUP.md §2

# 5. Crear el primer admin
#    ver supabase/SETUP.md §3

# 6. Levantar dev
npm run dev
# web   → http://localhost:3000
# admin → http://localhost:3001
```

### Si algo se traba

```bash
npm run dev:reset       # mata procesos, limpia .next/.turbo, repara bins, reinicia
```

---

## 📜 Scripts

```bash
npm run dev              # turbo run dev (web + admin en paralelo)
npm run dev:reset        # reset completo y re-arrancar
npm run build            # build de producción ambas apps
npm run check-types      # tsc en todos los paquetes
npm run test             # vitest (utils + futuros)
npm run lint             # eslint en todos los paquetes
npm run clean            # borrar .next/.turbo/cache
npm run format           # prettier
```

---

## 🧭 Estado del proyecto

Ver `ROADMAP_DESARROLLO.md` para detalle por fase.

| Fase | Módulo | Estado |
|---|---|---|
| 0 | Setup monorepo + schema SQL + RLS + ADRs | ✅ Completo |
| 1 | Landing premium + portal extranet (mock) | ✅ Completo |
| 2 | Auth Supabase + middleware + dashboard | ✅ Completo |
| 3 | Stock CRUD + Clientes + Leads Kanban | ✅ Completo |
| 4 | Ventas + Bancos + AFIP/MP/PDF + webhook MP | ✅ Completo (AFIP driver stub) |
| 5 | Inversiones FCI + extranet real | ⏳ Pendiente |
| 6 | Caja + cierres | ⏳ Pendiente |
| 7 | RRHH | ⏳ Pendiente |
| 8 | IA + analítica | ⏳ Pendiente |
| 9 | N8N workflows + alertas | ⏳ Pendiente |
| 10 | Hardening + producción | ⏳ Pendiente |

---

## 🚢 Deploy

Ver `.env.production.example` para checklist completo y `docker-compose.yml` con
Traefik labels (SSL automático). Subdominios provisionales hasta adquirir dominio:
- `svi.srv878399.hstgr.cloud` → landing + portal cliente/inversor
- `svi-erp.srv878399.hstgr.cloud` → sistema interno

Pre-deploy: ver `docs/PRODUCTION_HARDENING.md` (mensajes de error amigables,
borrar `/debug/jwt`, 2FA admin, rate limiting, etc).

```bash
# En el VPS
cd /opt/svi-erp
cp .env.production.example .env.production
# editar con valores reales
docker compose --env-file .env.production up -d --build
```

---

## 🔐 Convenciones críticas

- `empresa_id` en TODA tabla operativa (multi-tenancy)
- `empresa_id` en JWT como app_metadata claim (RLS sin subqueries)
- Soft delete con `deleted_at TIMESTAMPTZ` (nunca borrar)
- Numeración con `SEQUENCE` atómica (sin race conditions)
- Webhooks idempotentes vía tabla `webhook_eventos`
- Snapshots inmutables de comisiones y precios
- Tests Vitest >90% en cálculos FCI

Para más detalles ver `docs/adr/` y `SVI_PLAN_MAESTRO_DEFINITIVO.md`.

---

*Mantenido por Dev-Wolf Soluciones IT · Last update: 2026-04-28*
