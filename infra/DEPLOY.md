# 🚀 Deploy en VPS — SVI ERP/CRM

> Guía operativa para deployar SVI en el VPS Hostinger
> (`srv878399.hstgr.cloud`) donde ya corren Supabase + N8N + Evolution API
> + Traefik. Vigente al **2026-05-01** (post F5.7 + panel Evolution + F7 Agenda
> + F6.G capa IA transversal).

---

## 📋 Tabla de contenidos

1. [Arquitectura del deploy](#1-arquitectura-del-deploy)
2. [Pre-requisitos en el VPS](#2-pre-requisitos-en-el-vps)
2bis. [Redis dedicado SVI-ERP (F6.G+)](#redis-dedicado-svi-erp-f6g)
3. [Primer deploy — paso a paso](#3-primer-deploy--paso-a-paso)
4. [Configuración post-deploy](#4-configuración-post-deploy)
5. [Validación end-to-end](#5-validación-end-to-end)
6. [Updates posteriores](#6-updates-posteriores)
7. [Rollback](#7-rollback)
8. [Troubleshooting](#8-troubleshooting)
9. [Checklist único](#9-checklist-único)

---

## 1. Arquitectura del deploy

```
                          ┌─────────────────────────────────────┐
   Internet ──► Traefik ──┤                                     │
                          │  Red docker: n8n_evoapi             │
                          │   ├─ traefik (SSL via Let's Encrypt)│
                          │   ├─ n8n.srv878399.hstgr.cloud      │
                          │   ├─ evolution.srv878399.hstgr.cloud│
                          │   ├─ svi-web      (apps/web)        │
                          │   └─ svi-admin    (apps/admin)      │
                          │                                     │
                          │  Red docker: supabase_network       │
                          │   ├─ supabase-svi.srv878399.hstgr.. │
                          │   └─ svi-web + svi-admin (cliente)  │
                          └─────────────────────────────────────┘
```

**Hosts:**

| Servicio | Host actual (Hostinger) | Host futuro (cuando compres dominio) |
|---|---|---|
| Landing + portal cliente/inversor | `svi.srv878399.hstgr.cloud` | `svi.com.ar` (ej.) |
| Admin / ERP | `svi-erp.srv878399.hstgr.cloud` | `app.svi.com.ar` (ej.) |
| Supabase Studio + REST | `supabase-svi.srv878399.hstgr.cloud` | (mismo o privado) |
| N8N | `n8n.srv878399.hstgr.cloud` | (mismo) |
| Evolution API | `evolution.srv878399.hstgr.cloud` | (mismo) |

**Documentos vivos a tener al lado:**
- [`.env.production.example`](../.env.production.example) — variables + checklist pre-deploy
- [`docker-compose.yml`](../docker-compose.yml) — services con Traefik labels
- [`docs/PRODUCTION_HARDENING.md`](../docs/PRODUCTION_HARDENING.md) — qué cambiar antes del primer tráfico real
- [`supabase/SETUP.md`](../supabase/SETUP.md) — buckets, hook JWT, webhooks
- [`docs/n8n/README.md`](../docs/n8n/README.md) — workflows + credentials N8N

---

## 2. Pre-requisitos en el VPS

```bash
ssh root@srv878399.hstgr.cloud

# Docker + Compose ya instalados (los usan Supabase, N8N, Evolution)
docker --version
docker compose version

# Redes externas creadas (las creó el stack original de N8N/Supabase)
docker network ls | grep -E "n8n_evoapi|supabase_network"
```

Si alguna red falta:
```bash
docker network create n8n_evoapi
docker network create supabase_network
```

**Traefik debe estar corriendo en `n8n_evoapi`** con resolver `mytlschallenge`
(es el que ya emite los certs Let's Encrypt para `*.srv878399.hstgr.cloud`).

```bash
docker ps --filter "name=traefik" --format "{{.Names}}\t{{.Status}}"
```

**Puertos del firewall** (ya abiertos por el stack existente):
`80`, `443`, `443/udp` (HTTP/3).

---

## Redis dedicado SVI-ERP (F6.G+)

Stack independiente del Redis de Evolution API. Vive en `/opt/svi-erp/` con
su propio `docker-compose.yml`. Lo usan la capa IA transversal (cache de
prompts, sliding-window rate limit por usuario, hard stop por presupuesto
mensual de tokens) y futuros módulos.

### docker-compose.yml mínimo del stack

```yaml
services:
  svi_redis:
    image: redis:7.4-alpine
    container_name: svi_redis
    restart: always
    ports:
      - "6456:6379"
    command:
      - redis-server
      - --requirepass
      - ${SVI_REDIS_PASSWORD}
      - --maxmemory
      - 512mb
      - --maxmemory-policy
      - allkeys-lru
      - --appendonly
      - "yes"
      - --appendfsync
      - everysec
    volumes:
      - svi_redis_data:/data
    networks:
      - svi_net
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${SVI_REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  svi_net:
    name: svi_net
    driver: bridge

volumes:
  svi_redis_data:
    name: svi_redis_data
```

### .env del stack

```
SVI_REDIS_PASSWORD=<generar con: openssl rand -base64 32 | tr -d '/+=' | head -c 40>
```

### Connection string

En `.env.local` / `.env.production` de la app:
```
REDIS_URL=redis://default:<password>@srv878399.hstgr.cloud:6456
```

### Hardening firewall

Limitar acceso al puerto 6456 solo a IPs autorizadas:
```bash
sudo ufw allow from <IP_DEV> to any port 6456 proto tcp comment "SVI Redis dev"
```

---

## 3. Primer deploy — paso a paso

### 3.1. Clonar el repo

```bash
ssh root@srv878399.hstgr.cloud

# Path estándar acordado
git clone <URL_DEL_REPO> /root/svi-erp
cd /root/svi-erp

# Verificar HEAD
git log --oneline -3
```

### 3.2. Preparar `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production   # o vim, lo que prefieras
chmod 600 .env.production
```

Las variables están agrupadas en 5 secciones. **Leer el header de cada bloque**
del archivo (es la doc inline). Mínimo a completar para arrancar:

| Bloque | Variables | Dónde conseguirlas |
|---|---|---|
| Hosts | `WEB_HOST`, `ADMIN_HOST` | Ya pre-rellenadas con subdominios Hostinger |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `cat /root/supabase-svi/.env \| grep -E "ANON_KEY\|SERVICE_ROLE_KEY"` |
| AFIP | `AFIP_DRIVER=stub` | Mantener stub hasta tener cert AFIP real |
| Mercado Pago | `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` | Panel MP → Credenciales producción + Webhooks (después del deploy, ver §4.2) |
| N8N | `N8N_WEBHOOK_SECRET` | Generar `openssl rand -hex 32` y sincronizar con credential N8N (ver §4.3) |
| Evolution | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` | URL = `https://evolution.srv878399.hstgr.cloud`, API_KEY del container Evolution, instance `SVI-ERP` |
| Resend | `RESEND_API_KEY` | resend.com (necesario para SMTP del Supabase + emails transaccionales) |
| IA Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com (reservado para agente WA F8+) |
| IA OpenAI (F6.G+) | `OPENAI_API_KEY`, `OPENAI_DEFAULT_MODEL=gpt-5-mini`, `OPENAI_CHEAP_MODEL=gpt-5-nano`, `OPENAI_PREMIUM_MODEL=gpt-5`, `OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small` | platform.openai.com (capa IA transversal: insights, anomalías, forecast, chat, embeddings) |
| Redis SVI (F6.G+) | `REDIS_URL`, `AI_MONTHLY_BUDGET_USD=100`, `AI_RATE_LIMIT_PER_HOUR=100` | Stack `svi_redis` propio (ver sección dedicada arriba) |
| Sentry | `SENTRY_DSN` | sentry.io (recomendado desde día 1) |

**Atajo:** podés copiar tu `.secrets/.env.production` local (que ya tiene los
hosts + N8N_WEBHOOK_SECRET + Evolution pre-completados):

```bash
# Desde tu laptop (ANTES del SSH)
scp .secrets/.env.production root@srv878399.hstgr.cloud:/root/svi-erp/.env.production
```

Y completás solo los `⚠️ TODO` que falten en el VPS.

### 3.3. Verificar migrations Supabase aplicadas

Antes de levantar las apps, las 24 migrations tienen que estar aplicadas en
la DB de producción.

```sql
-- Studio → SQL Editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Tablas que tienen que existir (al 2026-05-01):
--   agenda_recursos       ← F7 ✅
--   agenda_disponibilidad ← F7 ✅
--   agenda_bloqueos       ← F7 ✅
--   agenda_turnos         ← F7 ✅
--   ai_chat_sessions      ← F6.G ✅ (0022)
--   ai_chat_messages      ← F6.G ✅ (0022)
--   ai_token_usage        ← F6.G ✅ (0023)
--   ai_embeddings         ← F6.G ✅ (0024 — requiere extensión vector)
--   audit_log
--   bancos
--   caja_*             ← F6 base ✅
--   clientes
--   empresas
--   inversiones
--   inversiones_aportes
--   inversores
--   leads
--   liquidaciones_inversion
--   numeracion_correlativos
--   roles
--   solicitudes_aporte
--   sucursales
--   usuario_sucursal_rol
--   usuarios
--   vehiculos
--   ventas
--   webhook_eventos

-- Vista útil F6.G:
--   ai_usage_current_month  (consumo de tokens del mes corriente por empresa)
```

⚠️ La migration `0024_pgvector_embeddings.sql` requiere la extensión
`vector`. Si no está disponible en el VPS, ver `supabase/SETUP.md` sección
"Migraciones de capa IA (F6.G+)" para el procedimiento de instalación.

Si alguna falta, copiar el SQL de `supabase/migrations/` y pegar en SQL Editor
en orden. Detalle en `supabase/SETUP.md` §11.

### 3.4. Hardening Supabase self-hosted (recomendado antes del tráfico)

Aplica `DISABLE_SIGNUP=true`, configura SMTP y suma los hosts productivos a
`ADDITIONAL_REDIRECT_URLS`. Idempotente, hace backup automático.

```bash
# En el VPS
sudo SMTP_PROVIDER=resend SMTP_API_KEY=re_xxxxxxxxxxxx \
  bash /root/svi-erp/infra/scripts/harden-supabase-self-hosted.sh
```

Después en Studio → Authentication → URL Configuration:
- **Site URL:** `https://svi-erp.srv878399.hstgr.cloud`
- **Redirect URLs:** sumar `https://svi.srv878399.hstgr.cloud/**` y `https://svi-erp.srv878399.hstgr.cloud/**`

Detalle en `docs/PRODUCTION_HARDENING.md` §14.

### 3.5. Build & Up

```bash
cd /root/svi-erp
docker compose --env-file .env.production up -d --build
```

| Tipo de build | Tiempo aproximado |
|---|---|
| Primer build (cache vacío) | 5-8 min |
| Build incremental (cambio de TS) | 2-3 min |
| Build sin cambios (Docker cache hit) | 30-60s |

Traefik detecta los labels automáticamente y emite SSL vía Let's Encrypt al
primer request en cada host (puede tomar ~30s la primera vez).

```bash
# Validar que ambos servicios estén Up
docker compose ps
```

Output esperado:
```
NAME         COMMAND                  STATUS
svi-web      "node server.js"         Up X seconds
svi-admin    "node server.js"         Up X seconds
```

---

## 4. Configuración post-deploy

### 4.1. Buckets privados de Supabase Storage

Si es la primera vez deployando, crear los 3 buckets en Studio → Storage → New bucket:

| Bucket | Public | Mime types | Para qué |
|---|---|---|---|
| `contratos-pdf` | NO | `application/pdf` | F4 — contratos de venta |
| `contratos-fci` | NO | `application/pdf` | F5.5 — contratos FCI |
| `recibos-liquidacion` | NO | `application/pdf` | F5.4.1 — recibos pago inversores |

Detalle SQL listo para pegar en `supabase/SETUP.md` §10.

### 4.2. Webhook Mercado Pago

```
1. Panel MP → Tu aplicación → Webhooks → Configurar notificaciones
2. URL productiva: https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago
3. Eventos: marcar "Pagos"
4. Copiar la clave secreta generada
5. Pegarla en .env.production como MP_WEBHOOK_SECRET
6. Reiniciar admin: docker compose --env-file .env.production up -d svi-admin
```

Detalle del flujo en `supabase/SETUP.md` §13.

### 4.3. N8N — workflow F5.7 (liquidación mensual)

El workflow ya está creado en N8N (id `r56M78ub99tNg3EA`). Lo único que
queda en este deploy:

1. **Generar / usar el `N8N_WEBHOOK_SECRET`** ya configurado en `.env.production`.
2. **Sincronizar** ese mismo valor en la credential N8N **`SVI · x-n8n-secret`**
   (UI N8N → Credentials → editar → Save).
3. **Verificar la credential `SVI · Evolution API`** tiene el apikey correcto
   de Evolution.
4. **Mover el workflow a `/personal/SVI-ERP`** desde la UI (3 clicks).
5. **Activar el toggle** del workflow (no antes de §5.3 validar e2e).

Detalle completo en `docs/n8n/README.md`.

### 4.4. Conectar WhatsApp del owner (Evolution API)

```
1. Login en https://svi-erp.srv878399.hstgr.cloud (super_admin)
2. Sidebar → Configuración → WhatsApp · Evolution API
3. Click "Generar QR"
4. Escanear desde WhatsApp del owner: Configuración → Dispositivos vinculados → Vincular dispositivo
5. La página detecta la conexión sola y pasa a estado "Conectado"
```

(Antes había que ir a Evolution Manager UI; ahora se hace desde el propio admin.)

### 4.5. Cargar teléfono del owner en `usuarios`

El workflow F5.7 (y futuros F9) consultan `usuarios` con rol admin/super_admin
y `telefono != NULL`. Verificar / cargar:

```sql
-- Studio → SQL Editor
SELECT u.email, u.telefono, r.nombre AS rol
FROM usuarios u
JOIN usuario_sucursal_rol usr ON usr.usuario_id = u.id
JOIN roles r ON r.id = usr.rol_id
WHERE r.nombre IN ('super_admin', 'admin')
  AND u.deleted_at IS NULL;

-- Si telefono está NULL:
UPDATE usuarios SET telefono = '+5491165432123' WHERE id = '<UUID_USUARIO>';
```

### 4.6. Activar inversor con portal (opcional)

Solo si vas a tener inversores con acceso al `/portal/inversor`:

```sql
-- 1. Studio → Authentication → Users → Add user (email + password)
-- 2. Copiar el UUID del auth user
-- 3. Vincular en SQL Editor:
UPDATE inversores
SET portal_user_id = '<UUID_AUTH_USER>',
    portal_activo = true
WHERE id = '<UUID_INVERSOR>';
```

---

## 5. Validación end-to-end

### 5.1. Smoke tests HTTP

```bash
# Landing
curl -I https://svi.srv878399.hstgr.cloud
# 200 OK

# Admin (debería redirigir a /login si no hay sesión)
curl -I https://svi-erp.srv878399.hstgr.cloud
# 200 OK / 307

# Webhook MP (responde a GET con health-check)
curl https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago
# {"ok":true,"service":"mercadopago-webhook"}
```

### 5.2. Validar JWT hook (crítico)

```sql
-- En Studio → SQL Editor
SELECT raw_app_meta_data FROM auth.users LIMIT 1;
```

Si no aparecen `empresa_id`, `rol`, `sucursales` → el hook NO está activo.
Ver `supabase/SETUP.md` §2.

### 5.3. Validar workflow N8N F5.7

```bash
# Test manual con curl desde tu laptop (con el secret real)
curl -X POST "https://svi-erp.srv878399.hstgr.cloud/api/webhooks/n8n/liquidaciones/run-mensual" \
  -H "x-n8n-secret: <N8N_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respuesta esperada:
```json
{
  "ok": true,
  "deduplicated": false,
  "periodo": "202604",
  "creadas": 0,
  "ya_existian": 0,
  "errores": [],
  "empresas_procesadas": 1,
  "notificar_a": [
    { "nombre": "Owner", "telefono_wa": "5491165432123", "email": "owner@svi.com.ar" }
  ]
}
```

Después en N8N → workflow F5.7 → **Execute Workflow** (manual) → debería:
1. Llamar al SVI (200 OK).
2. Iterar sobre `notificar_a`.
3. Mandar mensaje WA al owner.

Si llega el WA, **activar el toggle** del workflow → corre el día 1 a las 07:30 ART.

### 5.4. Validar panel Evolution

`/configuracion/integraciones/whatsapp` debe mostrar:
- Endpoint con check ✓ "API Key configurada"
- Estado actual (open / close / connecting) sincronizado con Evolution

### 5.5. Validar contrato firmado

Crear una venta de prueba → "Generar contrato" → bajar el PDF → debería tener
QR + hash en footer + signed URL válida 1h.

### 5.6. Validar Agenda (F7)

```
1. /agenda/recursos/nuevo → crear recurso "Owner — Nahuel" tipo owner
2. Detalle del recurso → agregar disponibilidad L-V 09:00-18:00 slot 30min
3. /agenda/turnos/nuevo → crear turno (persona externa OK para test)
4. /agenda → debe aparecer el turno con color del recurso, badge "Solicitado"
5. Click en el turno → "Confirmar" → estado pasa a verde
6. Volver al calendario → confirmar overlap-prevention: intentar crear otro
   turno en el mismo horario y recurso → debe rechazar con mensaje claro
```

Verificar en SQL que el trigger `pg_notify('svi_agenda', ...)` se está
disparando (lo va a usar N8N en F7.5 para sync Google Calendar):

```sql
-- Listen en una conexión paralela mientras creás un turno
LISTEN svi_agenda;
```

---

## 6. Updates posteriores

### Update sin migrations nuevas

```bash
ssh root@srv878399.hstgr.cloud
cd /root/svi-erp
git pull
docker compose --env-file .env.production up -d --build
# Las apps se reconstruyen sin downtime (Traefik mantiene la versión vieja
# hasta que la nueva pase healthcheck).
```

### Update con migrations nuevas

```bash
git pull

# 1. PRIMERO aplicar las migrations en Supabase Studio (SQL Editor)
#    Ver supabase/migrations/ por archivos nuevos.
#    Ej: 0021_agenda.sql

# 2. RECIÉN DESPUÉS rebuild de las apps
docker compose --env-file .env.production up -d --build
```

⚠️ Hacer al revés (build primero) puede romper la app porque queries con
columnas que aún no existen → 500.

### Update solo de variables de entorno

```bash
nano .env.production
docker compose --env-file .env.production up -d
# (sin --build, solo restart con las vars nuevas)
```

---

## 7. Rollback

### Rollback de código (volver al commit anterior)

```bash
cd /root/svi-erp
git log --oneline -5             # ver commits recientes
git checkout <SHA_ANTERIOR>
docker compose --env-file .env.production up -d --build
```

### Rollback de migration

Las migrations son **forward-only** (no hay un script `down`). Para revertir:
1. Escribir un script SQL inverso manualmente.
2. Aplicarlo en Studio → SQL Editor.
3. Idealmente, antes de cualquier migration destructiva: `pg_dump` del schema actual.

### Rollback completo (todo cae)

```bash
docker compose down              # baja svi-web + svi-admin (Traefik sigue)
git checkout <SHA_ANTERIOR>
docker compose --env-file .env.production up -d --build
```

---

## 8. Troubleshooting

### Síntomas comunes

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| `502 Bad Gateway` | App caída o sin pasar healthcheck | `docker compose logs svi-admin` (mirar últimas 50 líneas) |
| `cert error` en el browser | DNS aún no propagado o Traefik no emitió cert | `dig +short svi-erp.srv878399.hstgr.cloud` desde el VPS |
| `auth: getUser() returns null` con sesión activa | JWT hook desactivado en Supabase | Ver `supabase/SETUP.md` §2 |
| Server actions: `"Sin empresa_id en JWT"` | El claim no llega al server side | Helper `getSviClaims()` ya implementado en `apps/admin/src/lib/auth/claims.ts` |
| Webhook MP devuelve 401 | Firma HMAC inválida | Verificar `MP_WEBHOOK_SECRET` matchea el del panel MP |
| Webhook N8N devuelve 401 | Secret no coincide | Comparar `N8N_WEBHOOK_SECRET` (en `.env`) con el valor de la credential N8N `SVI · x-n8n-secret` |
| Workflow N8N falla con `400 Bad Request` al enviar WA | Instancia Evolution no está `open` | Panel admin → Configuración → WhatsApp → Generar QR |
| Build falla por OOM | VPS chico (<2 GB libres) | Buildear localmente y `docker save / docker load`, o agregar swap |
| `column does not exist` post-deploy | Migration nueva no aplicada en producción | Studio → SQL Editor → aplicar la pendiente |
| Toda request del admin devuelve 500 | RLS bloqueó algo nuevo | `docker compose logs svi-admin --tail 100` y buscar `42501` |

### Logs útiles

```bash
# Logs en vivo de los 2 servicios
docker compose logs -f --tail 100

# Solo un servicio
docker compose logs -f svi-admin

# Últimas N líneas (sin -f)
docker compose logs --tail 200 svi-web

# Logs del Traefik (otro stack)
docker logs traefik --tail 100
```

### Verificar conectividad de redes docker

```bash
# Que svi-admin pueda hablar con Postgres del Supabase
docker exec svi-admin sh -c "wget -qO- supabase-svi:8000/rest/v1/ -H 'apikey: <ANON>' 2>&1 | head -3"

# Que svi-admin pueda hablar con Evolution
docker exec svi-admin sh -c "wget -qO- http://evolution_api:8080 2>&1 | head -3"
```

---

## 9. Checklist único

Imprimible / pegable en un bloc de notas durante el deploy.

```
┌─────────────────────────────────────────────────────────────────┐
│  PRE-DEPLOY                                                     │
├─────────────────────────────────────────────────────────────────┤
│ □ Redes docker n8n_evoapi y supabase_network existen           │
│ □ Traefik corriendo en n8n_evoapi con resolver mytlschallenge  │
│ □ DNS svi.srv878399.hstgr.cloud + svi-erp.srv878399 → IP VPS   │
│ □ /root/svi-erp clonado y up to date                           │
│ □ .env.production completo (sin TODO ⚠️ de bloque CRÍTICO)     │
│ □ Migrations 0001-0024 aplicadas en Supabase (incl. 0022-0024) │
│ □ Extensión pgvector disponible (req. para 0024)               │
│ □ Stack svi_redis levantado y accesible (REDIS_URL)            │
│ □ JWT hook activo (verificar en SQL: SELECT raw_app_meta_data) │
│ □ Hardening Supabase aplicado (script + Studio Redirect URLs)  │
├─────────────────────────────────────────────────────────────────┤
│  DEPLOY                                                         │
├─────────────────────────────────────────────────────────────────┤
│ □ docker compose --env-file .env.production up -d --build      │
│ □ docker compose ps → ambos services Up                        │
│ □ curl -I https://svi.srv878399.hstgr.cloud → 200              │
│ □ curl -I https://svi-erp.srv878399.hstgr.cloud → 200/307      │
├─────────────────────────────────────────────────────────────────┤
│  POST-DEPLOY                                                    │
├─────────────────────────────────────────────────────────────────┤
│ □ Buckets contratos-pdf + contratos-fci + recibos-liquidacion  │
│ □ Webhook MP configurado en panel MP + secret en .env          │
│ □ Workflow N8N r56M78ub99tNg3EA en /personal/SVI-ERP           │
│ □ Credentials N8N: SVI · x-n8n-secret + SVI · Evolution API    │
│ □ WhatsApp owner conectado vía /configuracion/integraciones/.. │
│ □ Telefono cargado en usuarios (admin/super_admin)             │
│ □ Test workflow manual desde N8N → llega WA al owner           │
│ □ Workflow N8N activado (toggle on)                            │
├─────────────────────────────────────────────────────────────────┤
│  VALIDACIÓN                                                     │
├─────────────────────────────────────────────────────────────────┤
│ □ Login admin con super_admin → ve dashboard sin errores       │
│ □ /portal/inversor con un inversor activado → ve sus datos     │
│ □ Crear venta de prueba → generar contrato PDF con QR          │
│ □ Generar liquidación manual → recibo PDF con sello            │
│ □ Sentry recibiendo eventos (si activado)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Scripts y archivos de referencia

| Recurso | Path | Para qué |
|---|---|---|
| Compose | `/docker-compose.yml` | Orquestación apps + Traefik labels |
| Env template | `/.env.production.example` | Referencia + checklist 8 pasos |
| Hardening | `/infra/scripts/harden-supabase-self-hosted.sh` | SMTP + DISABLE_SIGNUP + redirect URLs |
| Workflow N8N | `/docs/n8n/workflows/personal-svi-erp/01-liquidacion-mensual.json` | Source of truth del workflow F5.7 |
| Migrations | `/supabase/migrations/` | DDL ordenado 0001 → 0024 (incl. 0022-0024 capa IA) |
| Setup Supabase | `/supabase/SETUP.md` | Hook JWT + buckets + webhooks |
| Hardening doc | `/docs/PRODUCTION_HARDENING.md` | 16 secciones de cosas pre-prod |

---

## 11. Backups

| Qué | Cómo | Frecuencia |
|---|---|---|
| Repo SVI | Está en git (origin) | (commit) |
| `.env.production` | `cp .env.production /root/backups/env-$(date +%F).bak` | Cada cambio |
| Postgres Supabase | `pg_dumpall` del stack Supabase | Diario (configurar pg_cron o systemd timer) |
| Storage buckets | `s3cmd sync` o snapshot del filesystem del Supabase | Semanal |
| Backup `.env` Supabase auth | El script de hardening crea `.env.bak.YYYYMMDDHHMMSS` automáticamente | Cada cambio |

Backup mínimo viable (script en cron diario):

```bash
#!/usr/bin/env bash
DATE=$(date -u +%Y%m%d-%H%M)
mkdir -p /root/backups/$DATE
cp /root/svi-erp/.env.production /root/backups/$DATE/svi.env
docker exec supabase-db pg_dumpall -U postgres > /root/backups/$DATE/postgres.sql
find /root/backups -mtime +30 -type d -exec rm -rf {} +  # retención 30d
```

---

*Última actualización: 2026-05-01 — post F6.G capa IA transversal (svi_redis + OpenAI + pgvector).*
*Sincronizar este archivo con cada cambio operativo de deploy.*
