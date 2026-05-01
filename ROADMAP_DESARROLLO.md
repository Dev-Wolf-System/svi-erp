# 🏎️ ROADMAP DE DESARROLLO — SVI ERP/CRM

**Estado:** 🟢 En desarrollo activo
**Fase actual:** F7 🟡 Agenda — base + secretaria completas; pendiente F7.4-F7.7 + F6 Caja + F8 Agente IA
**Última actualización:** 2026-05-01

> Plan completo: `SVI_PLAN_MAESTRO_DEFINITIVO.md` v2.1
> Decisiones: `docs/adr/`
> Setup operativo: `supabase/SETUP.md` · `infra/DEPLOY.md`

---

## 📊 Estado por fase

| Fase | Nombre | Estado | Notas |
|------|--------|--------|-------|
| **FASE 0** | Setup monorepo + schema SQL + RLS + ADRs | ✅ **Completo** | 11 migrations, 7 ADRs, CI básico |
| **FASE 1** | Landing premium + portal extranet (mock) | ✅ **Completo** | 6 secciones, SEO + Schema.org |
| **FASE 2** | Auth Supabase + middleware + dashboard base | ✅ **Completo** | JWT claims hook funcional |
| **FASE 3** | Stock CRUD | ✅ **Completo** | Listado, alta, detalle, soft delete contra DB real |
| **FASE 3 bis** | Clientes CRUD + leads Kanban | ✅ **Completo** | CRUD clientes persona/empresa + pipeline drag-and-drop |
| **FASE 4** | Ventas + Bancos + AFIP/MP/PDF | ✅ **Completo** | AFIP stub, MP preference, contrato PDF firmado en Storage |
| **FASE 4.5** | Webhook Mercado Pago | ✅ **Completo** | HMAC + idempotencia vía `webhook_eventos` |
| **FASE 5.1** | Inversores CRUD | ✅ **Completo** | CBU/alias en plano (cifrado pgsodium pendiente, ver HARDENING §13) |
| **FASE 5.2** | Inversiones CRUD + cambio de tasa | ✅ **Completo** | Numeración atómica, historial de tasas con motivo |
| **FASE 5.3** | Cálculos liquidación + tests | ✅ **Completo** | 52 tests, half-even rounding, simple+compuesta |
| **FASE 5.4** | Liquidaciones (UI + idempotencia) | ✅ **Completo** | Generación manual y por lote, pago, anulación |
| **FASE 5.5** | Contrato PDF FCI con hash + QR | ✅ **Completo** | Bucket contratos-fci + página /vi/[numero] |
| **FASE 5.6** | Portal extranet inversor + admin solicitudes | ✅ **Completo** | apps/web/portal/inversor + módulo solicitudes-aporte |
| **FASE 5.7** | N8N workflow liquidación mensual | ✅ **Completo** | Endpoint webhook + workflow N8N + destinatarios desde Supabase + panel Evolution en admin |
| FASE 6 | Caja + cierres diarios | ⚪ Pendiente | |
| **FASE 7.1–7.3** | **Agenda del owner** — migration + módulo + UI calendario | ✅ **Completo** | Migration 0021 + módulo + calendario semanal + CRUD recursos |
| **FASE 7.8** | **Panel Secretaria** | ✅ **Completo** | Sidebar role-adaptive + dashboard día + kanban leads + agenda vendedores |
| FASE 7.4 | Selector real cliente/inversor/lead en formulario turno | ⚪ Pendiente | Hoy es UUID manual |
| FASE 7.5 | Sync Google Calendar via N8N (`agenda-google-sync`) | ⚪ Pendiente | `pg_notify` → N8N → Google Calendar API |
| FASE 7.6 | Drag & drop para reagendar en calendario | ⚪ Pendiente | dnd-kit sobre el calendario semanal |
| FASE 7.7 | Vista mensual + vista día | ⚪ Pendiente | |
| FASE 8 | Agente IA conversacional WhatsApp — read-only | ⚪ Pendiente | `packages/agent` + identidad telefónica + tools de consulta |
| FASE 8.5 | Agente WA — escritura (turnos, modo liquidación, aportes) | ⚪ Pendiente | Tools write con doble confirmación + rate limit |
| FASE 8.6 | Agente WA — owner / secretaria | ⚪ Pendiente | Tools admin + PIN de sesión + audit log enriquecido |
| FASE 9 | N8N workflows proactivos | ⚪ Pendiente | Recordatorios, alertas, conciliación MP, stock crítico |
| FASE 10 | Hardening + producción | ⚪ Pendiente | Tests E2E, security audit, deploy, 2FA, cifrado pgsodium |
| FASE 11 | RRHH y personal *(reordenado)* | ⚪ Pendiente | Movido detrás del agente — sin urgencia operativa hoy |

---

## ✅ Fase 0 — Setup (terminado)

**Entregado:**
- Monorepo Turborepo con apps `web` + `admin` y 6 packages
- Tailwind v4 CSS-first con tokens SVI compartidos
- Supabase self-hosted conectado (`supabase-svi.srv878399.hstgr.cloud`)
- 11 migraciones SQL aplicadas:
  - Extensiones (pg_trgm, pgsodium, pg_cron) y ENUMs
  - Tablas core (empresas, sucursales, roles, usuarios, RBAC)
  - JWT claims hook + helpers `auth.empresa_id()` / `auth.rol()` / `auth.sucursales()`
  - Numeración correlativa atómica (sin race conditions)
  - Webhook eventos con UNIQUE para idempotencia
  - Audit log con trigger genérico
  - Clientes y leads
  - Vehículos con full-text search + historial de precios
  - Inversiones FCI flex-first
  - Ventas con AFIP adapter-ready
  - Caja
  - Políticas RLS optimizadas con JWT claims
  - Cron jobs (liberación reservas + liquidación FCI)
- 7 ADRs documentando decisiones
- CI básico en GitHub Actions
- Docker stack para deploy en VPS (web + admin + Caddy con SSL automático)

---

## ✅ Fase 1 — Landing premium (terminado)

**Entregado** en `apps/web`:
- Hero con parallax + mesh gradient + grid pattern
- Value props (3 cards glass)
- Catálogo preview con 6 vehículos mock
- Simulador de inversión interactivo
- Sección sucursales (3)
- CTA portal cliente/inversor
- Footer completo
- Portal `/portal` con login + dashboards mock cliente/inversor
- SEO completo + JSON-LD AutoDealer

---

## ✅ Fase 2 — Auth + Dashboard base (terminado)

**Entregado** en `apps/admin`:
- Login con UI premium (split layout branded)
- Middleware Next 15 con `@supabase/ssr` (refresca sesión + protege rutas)
- Layout dashboard con Sidebar + Topbar
- Selector de sucursal con Zustand persistido
- UserMenu con logout
- Dashboard principal con KPIs mock + IA insights placeholder + tabla operaciones
- Página `/debug/jwt` para diagnosticar claims (borrar antes de prod)

---

## ✅ Fase 3 — Stock + Clientes + Leads (terminado)

### Stock ✅

`apps/admin/src/modules/stock/` (módulo autocontenido siguiendo §3.3 del plan):
- `schemas.ts` — Zod (create, update, filters)
- `queries.ts` — server-only (getVehiculos, getVehiculoById, getStockCount, getSucursales)
- `actions.ts` — server actions (create, update, softDelete) con validación + JWT claims

Rutas:
- `/stock` — listado server-rendered con filtros + toggle grilla/tabla + empty state
- `/stock/nuevo` — form RHF + zodResolver, 3 secciones, toast feedback
- `/stock/[id]` — detalle con foto, sidebar precio, historial de precios automático
- soft delete con confirmación 2-clicks

### Clientes ✅

`apps/admin/src/modules/clientes/` (mismo patrón modular que stock):
- `schemas.ts` — Zod (create, update, filters) con validación CUIT/DNI AR
- `queries.ts` — server-only (getClientes, getClienteById, getClientesCount, getProvinciasDistintas)
- `actions.ts` — server actions (create, update, softDelete) con `empresa_id` del JWT

Rutas:
- `/clientes` — listado con tabla + filtros (búsqueda, tipo, provincia, portal)
- `/clientes/nuevo` — form RHF + zodResolver con switch persona/empresa (cards radio)
- `/clientes/[id]` — detalle con datos generales, contacto, notas, placeholders para historial unificado (Fases 4-5)
- soft delete confirmado en 2 clicks

### Leads ✅ (Kanban)

`apps/admin/src/modules/leads/`:
- `schemas.ts` — 6 estados (nuevo → contactado → calificado → oportunidad → ganado/perdido)
- `queries.ts` — `getLeads()` agrupa por estado para alimentar el board
- `actions.ts` — `createLead`, `updateLeadEstado` (drag-drop), `asignarVendedor`

Ruta `/leads`:
- Kanban con `@dnd-kit/core` — 6 columnas con código de color por estado
- Drag-and-drop con optimistic update + rollback en error
- Modal de alta de lead con formulario completo
- Cards con avatar inicial, contacto, mensaje truncado y timestamp

---

## ✅ Fase 4 — Ventas + Bancos + AFIP/MP/PDF (terminado)

### Packages compartidos

`packages/integrations/` (`@repo/integrations`):
- `afip/` — interface `AfipFacturador`, `AfipStubDriver` con CAE simulado de 14 dígitos, validaciones AFIP reales (importe_total = neto+iva ±0.02, CUIT 11 dígitos, etc.). Factory `getAfipDriver()` con cache lee `AFIP_DRIVER` env. Tests Vitest exhaustivos.
- `mercadopago/` — `createPreference`, validador HMAC de webhook, types Checkout Pro. Idempotency key obligatoria. Tests del validador.

`packages/pdf/` (`@repo/pdf`):
- `contrato-venta/` — template `@react-pdf/renderer` con membrete SVI (header dorado, signature blocks, footer paginado). Schema Zod valida la entrada antes de renderizar. `renderContratoVenta(data): Promise<Buffer>`. 10 tests cubren contado, financiado, parte_pago, cliente empresa y validaciones.
- Fonts opcionales: `registerSviFonts(fontsDir)` para Montserrat + DM Sans local. Sin registro cae a Helvetica nativo (PDF standard).

### Módulo bancos

`apps/admin/src/modules/bancos/`:
- CRUD con `condiciones JSONB` (tasa_min/max, cuotas_min/max, monto_max, requisitos)
- Toggle `activo` (no soft delete: pueden estar referenciados por ventas históricas)
- Rutas: `/bancos`, `/bancos/nuevo`, `/bancos/[id]` con detail + ToggleActivoButton

### Módulo ventas

`apps/admin/src/modules/ventas/`:
- `schemas.ts` — Zod con refines condicionales (parte_pago requiere vehiculo+valor, financiado requiere banco+monto+cuotas+tasa, comisión pct+monto atómicos)
- `queries.ts` — `getVentas`, `getVentasGroupedByEstado` (alimenta Kanban), `getVentaById` con joins
- `actions.ts` — `createVenta` (genera `numero_operacion` vía RPC `generar_numero_operacion`, reserva el vehículo 24h), `cambiarEstadoVenta` (marca vendido al llegar a entregado/finalizado), `anularVenta` (rechaza si CAE emitido, libera vehículo a stock, registra motivo)
- `integraciones.ts`:
  - `emitirFacturaAfip()` — FACTURA_A para empresa con CUIT, FACTURA_B para CF/persona, calcula neto+iva 21%, persiste CAE + driver + comprobante
  - `crearPreferenciaMP()` — preference con idempotency key, persiste `mp_preference_id`
  - `generarContratoVentaPdf()` — renderiza con `@repo/pdf`, sube a bucket privado `contratos-pdf` con path versionado e inmutable (`{empresa}/{venta}/{numero}-v{n}.pdf`), devuelve signed URL 1h

### Rutas ventas

- `/ventas` — Kanban estático con 6 columnas (estado_venta), badges para CAE/MP/PDF
- `/ventas/nueva` — form con vehículo (auto-rellena precio/sucursal/moneda), cliente, modalidad de pago, secciones condicionales (parte_pago, financiación con sugerencia de tasa/cuotas según banco), comisión opcional
- `/ventas/[id]` — detail con resumen económico, datos cliente/vehículo/parte/banco, dropdown cambio estado, botón anular con motivo, AccionesCard con 3 paneles (AFIP, MP, PDF)

### Helpers

- `apps/admin/src/lib/supabase/service.ts` — `createServiceClient()` para Storage de contratos firmados
- Migration `0012_ventas_constraints.sql` — 10 CHECK sobre `ventas`: tipo_pago en dominio, descuento ≤ precio, parte_pago/financiado completos, cuotas 1-120, TNA 0-999, CAE atómico, comisión snapshot atómica.

### Hardening pre-deploy aplicado durante operación inicial

- ✅ Bucket privado `contratos-pdf` creado en Supabase Storage
- ✅ `SUPABASE_SERVICE_ROLE_KEY` configurado en `.env.local`
- ✅ Migration `0012` aplicada (constraints ventas)
- ✅ Migration `0013` creada (SECURITY DEFINER en triggers internos) — **aplicar en Studio**
- ✅ Helper `getSviClaims()` en `apps/admin/src/lib/auth/claims.ts` — decodifica JWT directamente porque `auth.users.raw_app_meta_data` no tiene los claims del hook
- ✅ FKs explícitas (`vehiculos!ventas_vehiculo_id_fkey`) en queries de ventas — la tabla tiene 2 FKs hacia vehiculos (principal + parte de pago)
- ✅ Toaster sonner centralizado en `(dashboard)/layout.tsx` — había 12 montados a la vez causando crashes
- ✅ Mensajes de error en server actions devuelven `error.message` real (debug en dev — refactorizar pre-prod, ver `docs/PRODUCTION_HARDENING.md` §1)

### Pendiente para cierre F4

- AFIP sandbox/production drivers — pendientes de cert AFIP en trámite
- (F4.5 ✅ resuelto — ver sección dedicada abajo)

### Deploy infra preparada

- ✅ `docker-compose.yml` migrado de Caddy a **Traefik labels** con redes externas (`n8n_evoapi`, `supabase_network`)
- ✅ Variables `WEB_HOST` / `ADMIN_HOST` en lugar de `DOMAIN_NAME` (subdominios independientes)
- ✅ Hosts provisionales: `svi.srv878399.hstgr.cloud` (web) + `svi-erp.srv878399.hstgr.cloud` (admin)
- ✅ `.env.production.example` completo con checklist pre-deploy de 8 pasos
- ✅ `.env.local` sincronizado con todas las vars que F4 consume (vacías hasta cargar credenciales reales)

---

## ✅ Fase 4.5 — Webhook Mercado Pago (terminado)

**Endpoint:** `POST /api/webhooks/mercadopago` en admin (runtime nodejs).

### Flujo implementado
1. **HMAC-SHA256** verificada con manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (NO el bug clásico de pasar `request-id` como `id`). Helper en `@repo/integrations/mercadopago` (`verifyMpSignature`).
2. **Idempotencia** vía `INSERT INTO webhook_eventos (proveedor='mercadopago', external_id='<type>:<data.id>')`. La constraint UNIQUE atrapa el reintento → 200 `{deduplicated:true}` sin tocar la venta.
3. **Routing** por `external_reference` (formato `tipo:sucursal_id:referencia_id`): tipos `venta_seña` y `venta_saldo` actualizan `ventas.mp_payment_id` + `mp_status`.
4. **Decisión de diseño:** el webhook NO cambia `ventas.estado` automáticamente (no hace `reserva → documentacion`). Eso queda manual para el operador. Más conservador, evita race conditions con la UI.
5. Si el procesamiento lanza, persiste `error` en `webhook_eventos` y devuelve 500 → MP reintenta.

### Modo dev vs prod
- `NODE_ENV=production` con `MP_WEBHOOK_SECRET` no configurado → 500.
- En dev sin secret → se acepta sin firmar (facilita pruebas con curl).

### Tests añadidos
- `parseExternalReference` / `buildExternalReference` — 7 tests cubren round-trip, malformados, vacío.
- Total `@repo/integrations`: **45 tests** (24 AFIP stub + 14 HMAC + 7 external-reference).

### Documentación
- `supabase/SETUP.md` §13 — flujo + config panel MP + curl de test.
- `docs/PRODUCTION_HARDENING.md` §6 — credenciales productivas + URL del webhook.

### Pendiente
- Configurar el webhook en el panel de MP cuando esté el dominio productivo (URL: `https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago`).
- Generar `MP_WEBHOOK_SECRET` desde el panel y cargarlo en `.env.production`.

---

## ✅ Fase 5.6 — Portal extranet inversor (terminado)

**Entregado** en commit `9dd2eed`:
- `apps/web/src/app/portal/inversor/page.tsx` con datos reales (lista de inversiones del usuario logueado)
- `apps/web/src/app/portal/inversor/inversiones/[id]/` — detalle, decisión retirar/reinvertir, solicitar aporte
- `apps/admin/src/modules/solicitudes-aporte/` — admin de solicitudes que llegan desde portal
- Migration `0020_solicitudes_aporte_y_modo_solicitado.sql`
- Identidad: cada inversor con `portal_user_id` (auth.users) puede iniciar sesión y solo ver lo suyo (RLS)

**Hardening detectado** (commit `0eabbb6` → `docs/PRODUCTION_HARDENING.md` §14):
- SMTP del Supabase self-hosted está vacío → magic links, "olvidé clave" e Invite NO funcionan. Workaround: crear usuario con `Add user` (auto-confirma) y pasar password por canal externo.
- `DISABLE_SIGNUP=false` → cualquiera con la URL del Supabase puede crear cuenta huérfana.
- `ADDITIONAL_REDIRECT_URLS` solo apunta a localhost.
- Detalle y soluciones en HARDENING §14.

---

## ✅ Fase 5.7 — N8N workflow liquidación mensual (terminado)

**Decisión arquitectónica:** la lógica de cálculo se queda en TS (canónica, testeada con 52 tests Vitest, half-even rounding). N8N hace solo el **disparo programado** y la **notificación** del resumen al admin por WhatsApp.

### Componentes

1. **Refactor** `generarLiquidacionesMesActual` para aceptar `empresa_id` opcional (modo sistema, sin `getSviClaims`). Procesa todas las empresas si no se pasa.
2. **Endpoint** `POST /api/webhooks/n8n/liquidaciones/run-mensual`:
   - Auth `x-n8n-secret` contra `N8N_WEBHOOK_SECRET` (en producción obligatorio).
   - Idempotencia vía `webhook_eventos` (`proveedor='n8n'`, `external_id=liq-mensual:<empresa>:<YYYYMM>`).
   - Devuelve `{ creadas, ya_existian, errores: string[] }`.
3. **Workflow N8N** (`docs/n8n/workflows/personal-svi-erp/01-liquidacion-mensual.json`):
   - Schedule Trigger día 1 de cada mes 07:30 ART.
   - HTTP Request al endpoint con header `x-n8n-secret`.
   - IF según resultado:
     - Branch éxito → Evolution API `sendText` al WA del admin: "✅ Liquidación abril 2026: 23 creadas, 0 errores".
     - Branch error → mensaje crítico al admin con el stack.
4. **Doc** `docs/n8n/README.md` con instrucciones de import a la carpeta `/personal/SVI-ERP` de N8N.
5. **Env vars nuevas** en `.env.local` y `.env.production.example`: `N8N_WEBHOOK_SECRET` (rotable, ver HARDENING §15).

### Por qué NO pg_cron solo

Aunque pg_cron ya está habilitado y la migration 0011 tiene un placeholder para liquidación, el cálculo de intereses en PG requeriría replicar la lógica de redondeo half-even que en TS está en `@repo/utils/calculos-fci`. Mantener una sola fuente de verdad (TS, ya con tests) y disparar desde N8N es más mantenible. pg_cron sigue activo para liberación de reservas y para emitir `pg_notify` como tracer de auditoría.

### Estado en N8N

- **Workflow id:** `r56M78ub99tNg3EA` (carpeta `/personal/SVI-ERP`).
- **Credentials creadas:**
  - `SVI · x-n8n-secret` (httpHeaderAuth, dominio `svi-erp.srv878399.hstgr.cloud`).
  - `SVI · Evolution API` (httpHeaderAuth, dominio `evolution.srv878399.hstgr.cloud`).
- Se importaron vía REST API (N8N Community no expone Variables ni Folders por API).

### Bonus — panel Evolution embebido en admin

Ruta `/configuracion/integraciones/whatsapp` con:
- QR base64 embebido + polling automático cada 3s
- Botones Regenerar / Desconectar / Reiniciar / Refrescar
- Solo accesible con permiso `config.integraciones` (rol `super_admin`)
- Detección automática del cambio `close → open` cuando se escanea

Permite al owner reconectar WhatsApp sin entrar a Evolution Manager UI.
Reemplaza la dependencia de la UI externa para mantenimiento operativo.

---

## ⏳ Fase 6 — Caja

- Módulo `caja` con registro de ingresos/egresos
- Cierre diario con resumen
- Vista global (admin) + por sucursal
- Conciliación con MP via N8N
- Exportación XLS con membrete

---

## ✅ Fase 7 — Agenda del owner (adelantada)

> Adelantada respecto del plan maestro: el agente IA WA (F8) la consume para
> agendar/reagendar turnos a inversores y clientes. Sin agenda no hay agente
> útil para el owner / secretaria.

### ✅ Completo (F7.1–F7.3 + F7.8)

**Schema** (`supabase/migrations/0021_agenda.sql`):
- `agenda_recursos` — owner / asesor / vendedor / sala (multi-recurso).
- `agenda_disponibilidad` — franjas recurrentes por día de semana + slot_minutos.
- `agenda_bloqueos` — excepciones puntuales (vacaciones, feriados).
- `agenda_turnos` — instancia con estado, modalidad, persona (cliente/inversor/lead/external), `external_ref` UNIQUE para idempotencia desde el agente.
- Trigger anti-overlapping por recurso.
- `pg_notify('svi_agenda', …)` en INSERT/UPDATE → N8N consume para confirmaciones WA.

**Módulo admin** (`apps/admin/src/modules/agenda/`):
- Schemas Zod + queries server-only + server actions con RBAC.
- Calendario semanal, CRUD recursos/disponibilidad/bloqueos, confirmación/cancelación turnos.

**Panel Secretaria** (`apps/admin/src/app/(dashboard)/secretaria/`):
- Sidebar role-adaptive: `getNavByRol(rol)` — secretaria ve 5 items vs nav completa.
- `/secretaria` — dashboard del día: KPIs (turnos hoy / pendientes confirmar / leads sin asignar), próximos turnos 3h, accesos rápidos.
- `/secretaria/asignaciones` — kanban leads→vendedores con asignación inline (`asignarVendedor` action con `assertCan('leads.assign')`).
- `/secretaria/vendedores` — tabla vendedores activos con turnos de la semana y % ocupación.

### ⏳ Pendiente

| Sub-fase | Qué falta | Notas |
|---|---|---|
| F7.4 | Selector real de cliente/inversor/lead en formulario de nuevo turno | Hoy es UUID manual |
| F7.5 | Sync Google Calendar via N8N | `pg_notify` → N8N → Google Calendar API |
| F7.6 | Drag & drop para reagendar | dnd-kit sobre calendario semanal |
| F7.7 | Vista mensual + vista día | |

---

## ⏳ Fase 8 — Agente IA conversacional WhatsApp (read-only)

> El cerebro del agente vive en backend (`packages/agent` + Claude API con tool use).
> N8N es solo el conducto WhatsApp ↔ HTTP y, después, los workflows proactivos.

### Arquitectura

```
WA del usuario → Evolution API → N8N "wa-receptor" → POST /api/agente/chat
   → identificar usuario por número → cargar memoria → Claude API con tools filtradas por rol
   → ejecutar tools contra Supabase con RLS del rol → persistir → devolver texto
   → N8N → Evolution API → WA del usuario
```

### Componentes

- **`packages/agent/`** — cerebro, tools, memory, auth telefónica, rate limit, confirmación 2-step.
- **`POST /api/agente/chat`** — endpoint con auth `x-n8n-secret` que orquesta una vuelta de conversación.
- **`POST /api/agente/push`** — endpoint que el propio agente o N8N invocan para EMPUJAR un mensaje proactivo (recordatorio turno, etc.).
- **Migrations:**
  - `0022_asistente_conversaciones.sql` — `asistente_conversaciones` + `asistente_mensajes`.
  - `0023_telefono_verificado.sql` — agrega `telefono_verificado_at` a `inversores`, `clientes`, `usuarios`. Identifica inequívocamente al actor.

### Tools F8 (read-only para todos los roles)

- Lead: `infoEmpresa`, `simularInversion`.
- Cliente: `consultarMisVentas`, `consultarCuotasPendientes`, `agendarTurno`*.
- Inversor: `consultarMisInversiones`, `consultarLiquidacionesPendientes`, `consultarMiContrato`, `agendarTurno`*.

(*) `agendarTurno` queda flagueado como write pero entra acá porque es bajo riesgo (solo crea solicitud, el owner/secretaria confirma desde admin).

**Modelo:** Claude Sonnet 4.6 con prompt caching (system + tools + perfil = 1 cache breakpoint). Flag `AGENT_MODEL` permite subir a Opus en flujos críticos.

**Seguridad:**
- Match estricto número WA → registro DB. Sin match → respuesta genérica + invitación a registrarse.
- Challenge confirmando últimos 4 dígitos del DNI/CUIT antes de exponer datos financieros (1×/sesión 24h).
- Rate limit por número: 30 msg/min, 200/día.
- Audit log con `session_id` + tool calls + payloads.

---

## ⏳ Fase 8.5 — Agente WA escritura (inversor/cliente)

Tools write con **doble confirmación** ("¿Confirmás solicitar aporte de $X? respondé SI / NO"):
- `decidirModoLiquidacion(id, retirar|reinvertir)`
- `solicitarAporteAdicional(monto)`
- `cancelarTurno(id)` — limitado a turnos del propio usuario, hasta T-24h.

Cada acción write registra:
- `audit_log` con `actor_type='agente_wa'`, `actor_id`, `tool`, `payload_in`, `payload_out`, `confirm_token`.

---

## ⏳ Fase 8.6 — Agente WA para owner / secretaria

Roles internos requieren autenticación reforzada:
- Número WA del owner / secretaria pre-registrado en `usuarios.telefono` con `telefono_verificado_at` y rol `admin`/`secretaria`.
- **PIN de 6 dígitos** por sesión, válido 8h, generado desde admin app (botón "Habilitar sesión WA"). El PIN se manda al propio WA del usuario al pedirlo desde la UI.
- Logout automático a las 8h o por inactividad de 1h.

Tools owner/secretaria (todas con audit obligatorio):
- Read: `kpisDelDia`, `ventasDelMes`, `liquidacionesPendientesGlobal`, `stockCritico`, `clientesNuevos`.
- Agenda: `agendaDisponibilidad(rango)`, `crearTurno`, `reagendarTurno`, `cancelarTurno`, `bloquearAgenda`.
- Comunicación: `enviarMensajeInversor(id, plantilla)`, `enviarMensajeCliente(id, plantilla)`.

---

## ⏳ Fase 9 — N8N workflows proactivos

Una vez F8.6 cerrada, se cablean los workflows que disparan mensajes salientes:

| Workflow | Trigger | Idempotencia |
|---|---|---|
| Recordatorio vencimiento inversión | Cron diario 09:00 ART | `external_id=venc:<inversion_id>:<dias>` |
| Recordatorio turno T-1d / T-1h | Cron horario | `external_id=rec-turno:<turno_id>:<offset>` |
| Resumen diario operaciones al owner | Cron 20:00 | `external_id=resumen:<YYYYMMDD>` |
| Onboarding inversor | pg_notify al activar `portal_user_id` | `external_id=onb:<inversor_id>` |
| Conciliación MP | Cron diario 02:00 | `external_id=conc-mp:<YYYYMMDD>` |
| Stock crítico (>60d sin movimiento) | Cron 08:00 | `external_id=stock:<vehiculo_id>:<YYYYMMDD>` |
| Alerta error webhook MP / N8N | Webhook de SVI | — (alerta inmediata) |

Todos importables a `/personal/SVI-ERP` de N8N.

---

## ⏳ Fase 10 — Hardening + producción

Items acumulados en `docs/PRODUCTION_HARDENING.md`. Bloques principales:
- Mensajes de error amigables + Sentry (§1)
- 2FA TOTP + PIN para roles admin (§9)
- Cifrado pgsodium en CBU/alias (§13) y en payloads del agente (nuevo §16)
- Rate limiting global (§7)
- Hardening Supabase self-hosted: SMTP, DISABLE_SIGNUP, redirect URLs (§14)
- Rotación `N8N_WEBHOOK_SECRET` y `MP_WEBHOOK_SECRET` (§15)

---

## ⏳ Fase 11 — RRHH y personal *(reordenado)*

Movido al final porque no hay urgencia operativa hoy. Cuando llegue:
- Módulo `personal` con asignación multi-sucursal.
- Liquidación de sueldos.
- Panel de roles y permisos (UI sobre RBAC ya existente).

---

## 🐛 Bugs resueltos durante el desarrollo

| # | Síntoma | Causa | Fix | Commit |
|---|---|---|---|---|
| 1 | `npm run dev` retorna exit 0 sin output (WSL2) | npm crea `node_modules/.bin/*` con 0 bytes en `/mnt/` | `npm rebuild --bin-links` + postinstall que lo detecta | `3e56be6` |
| 2 | Login devuelve 500 con "function min(uuid) does not exist" | PG no tiene `MIN(uuid)` nativo | Separar SELECT de `sucursal_ppal` en query aparte | `6ee00fc` |
| 3 | Hook JWT no inyecta claims aunque está en `.env` | `docker-compose.yml` del `auth` no declaraba las vars en `environment:` | Agregar `GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_*` en el bloque environment | `6ee00fc` (doc) |
| 4 | `RangeError: maximumFractionDigits value is out of range` en build | `formatCurrencyCompact` con `min:2 + max:1` inconsistente | Setear `minimumFractionDigits: 0` en compact | bootstrap |
| 5 | `output: standalone` no genera `.next/standalone/` | `__dirname` no existe en ESM (apps tienen `type: module`) | `fileURLToPath(import.meta.url)` | bootstrap |
| 6 | Server actions fallan con "Sin empresa_id en JWT" pese a hook activo | `auth.getUser().user.app_metadata` lee de DB (`raw_app_meta_data`), no del JWT — el hook solo inyecta en el token | Helper `getSviClaims()` que decodifica el JWT del cookie via `getSession().access_token` | F4.1 |
| 7 | "Could not embed because more than one relationship was found" al listar ventas | `ventas` tiene 2 FKs hacia `vehiculos` (`vehiculo_id` y `vehiculo_parte_id`) — PostgREST no sabe cuál usar | Especificar FK por nombre: `vehiculos!ventas_vehiculo_id_fkey!inner` | F4.1 |
| 8 | "new row violates row-level security policy for table audit_log" al hacer INSERT/UPDATE en cualquier tabla auditada | `trg_audit_log()` y `generar_numero_operacion()` corren como `authenticated`; `audit_log` y `numeracion_correlativos` tienen RLS sin policy INSERT | Migration 0013: `ALTER FUNCTION ... SECURITY DEFINER SET search_path = ...` | F4.1 |
| 9 | "column empresas.telefono does not exist" al generar contrato PDF | El template asumía teléfono/email a nivel empresa; en SVI viven a nivel sucursal | Pedir contacto a `sucursales` y mapearlo al header del PDF | F4.1 |
| 10 | Crash con frame en `<Toaster>` al renderizar detail de venta | 12 componentes client tenían `<Toaster>` propio, montaje múltiple confundía sonner | Centralizar `<Toaster>` único en `(dashboard)/layout.tsx` | F4.1 |

---

## 📝 Convenciones del proyecto (recordatorio)

- **Editar > Reescribir** archivos existentes (ver `AhorrarTokens.md`)
- **Validar antes de declarar hecho** (compile + tests)
- **Server-only siempre** en queries (`import "server-only"`)
- **Schemas Zod** como fuente de verdad para validación
- **Server actions** + `revalidatePath` para mutaciones
- **Soft delete** vía `UPDATE deleted_at`, nunca `DELETE`
- **Cursor pagination**, no offset
- **Todos los selects con columnas explícitas**, no `*` (excepto detalles)

---

**Documentación viva:** actualizar este archivo al completar cada hito.
