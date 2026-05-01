# SVI ERP/CRM — Solo Vehículos Impecables

Sistema de gestión empresarial multisucursal para concesionaria automotor.
Stack: **Next.js 15 + Supabase + Drizzle + Turborepo + Tailwind v4 + OpenAI (gpt-5 family) + Redis (ioredis) + pgvector**.

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
│       │                   :3001 → app.svi.com.ar (prod)
│       └── src/
│           ├── modules/ai/        capa IA transversal (insights, anomalies,
│           │                        categorize, forecast, embeddings, chat)
│           ├── components/ai/     componentes UI reutilizables
│           │                        (<AiInsightsWidget>, <AiAnomalyBadge>,
│           │                         <AiSuggestInput>, <AiNarrativeBlock>,
│           │                         <AiForecastChart>, <AiChatFloating>)
│           └── app/api/ai/        7 endpoints REST de IA (insights, categorize,
│                                    anomalies, forecast, chat-SSE, analyze, report)
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
│   ├── migrations/       24 migraciones SQL versionadas (incluye 0022-0024 para capa IA)
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

> **Para usar la capa IA (F6.G+):** completar `OPENAI_API_KEY` y `REDIS_URL` en `.env.local`. Detalles en `infra/DEPLOY.md` sección Redis SVI.

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
| 5 | Inversiones FCI + portal extranet real + N8N liquidación mensual | ✅ Completo |
| Bonus F5 | Panel Evolution embebido (QR + estado WA en admin) | ✅ Completo |
| 7.1–7.3 | **Agenda** del owner — migration + módulo + UI calendario semanal | ✅ Completo |
| 7.4 | Selector real cliente/inversor/lead en formulario de nuevo turno | ✅ Completo |
| 7.8 | **Panel Secretaria** — sidebar role-adaptive + dashboard día + kanban + vista vendedores | ✅ Completo |
| 7.9 | **Kanban de turnos** — vista por estado (solicitado/confirmado/cumplido/cancelado) con acciones inline | ✅ Completo |
| 7.5 | Sync Google Calendar via N8N (`agenda-google-sync`) | ⏳ Pendiente |
| 7.6 | Drag & drop para reagendar en calendario semanal | ⏳ Pendiente |
| 7.7 | Vista mensual + vista día en calendario | ⏳ Pendiente |
| 6 base | Caja + cierres diarios | ✅ Completo |
| 6.G | **Capa IA Transversal** — migrations 0022-0024 + módulo `modules/ai/` + 7 endpoints + 6 componentes + asistente flotante | ✅ Completo |
| 6.A-6.F | Dashboard Caja con IA, búsqueda semántica, multi-moneda, reportes narrativa, auditoría, UX inteligente | ⏳ Pendiente |
| 8 | Agente IA conversacional WhatsApp (read-only → escritura → admin) | ⏳ Próximo |
| 9 | N8N workflows proactivos (vencimientos, recordatorios, conciliación) | ⏳ Pendiente |
| 10 | Hardening + producción (rate limit, 2FA, pgsodium, tests E2E) | ⏳ Pendiente |
| 11 | RRHH y personal *(reordenado al final)* | ⏳ Pendiente |

---

## 🚢 Deploy

**Guía operativa principal:** [`infra/DEPLOY.md`](infra/DEPLOY.md) — 11 secciones
cubriendo arquitectura, primer deploy paso a paso, configuración post-deploy,
validación e2e, updates, rollback, troubleshooting y checklist único.

Subdominios provisionales hasta adquirir dominio:
- `svi.srv878399.hstgr.cloud` → landing + portal cliente/inversor
- `svi-erp.srv878399.hstgr.cloud` → sistema interno
- `n8n.srv878399.hstgr.cloud` → workflows
- `evolution.srv878399.hstgr.cloud` → WhatsApp Business
- `supabase-svi.srv878399.hstgr.cloud` → Studio + REST + Auth

**Pre-deploy obligatorio:**
- [`docs/PRODUCTION_HARDENING.md`](docs/PRODUCTION_HARDENING.md) — 16 secciones
  (mensajes de error amigables, borrar `/debug/jwt`, 2FA admin, rate limiting,
  SMTP Supabase, DISABLE_SIGNUP, redirect URLs, rotación secrets, cifrado pgsodium).
- Script idempotente `infra/scripts/harden-supabase-self-hosted.sh` aplica §14.1-14.3
  con un comando.

```bash
# En el VPS
ssh root@srv878399.hstgr.cloud
git clone <REPO> /root/svi-erp && cd /root/svi-erp
cp .env.production.example .env.production
nano .env.production              # completar valores reales

# Hardening del Supabase auth (idempotente)
sudo SMTP_PROVIDER=resend SMTP_API_KEY=re_xxx \
  bash infra/scripts/harden-supabase-self-hosted.sh

# Levantar apps
docker compose --env-file .env.production up -d --build
```

Detalle completo y checklist imprimible en `infra/DEPLOY.md` §3 a §9.

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

*Mantenido por Dev-Wolf Soluciones IT · Last update: 2026-05-01 (post F6.G capa IA transversal)*
