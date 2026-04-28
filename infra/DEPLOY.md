# Deploy en VPS — SVI ERP/CRM

Guía operativa para levantar `apps/web` y `apps/admin` en el mismo VPS donde
ya corren Supabase + n8n + evolution-api detrás de Traefik.

> **Stack actual (2026-04-28):** docker-compose orquesta los 2 services Next.js
> con labels Traefik. Las apps se conectan a las redes externas `n8n_evoapi`
> (donde vive Traefik) y `supabase_network` (donde vive Postgres).
>
> **Documentos vivos:**
> - `.env.production.example` — variables + checklist pre-deploy de 8 pasos
> - `docker-compose.yml` — services con Traefik labels
> - `docs/PRODUCTION_HARDENING.md` — qué cambiar antes del primer tráfico real
> - `supabase/SETUP.md` §13 — configuración del webhook Mercado Pago

---

## 1. Requisitos en el VPS

```bash
# Docker + Docker Compose ya instalados (los usan Supabase y n8n)
docker --version
docker compose version

# Verificar redes externas creadas previamente
docker network ls | grep -E "n8n_evoapi|supabase_network"
```

Si Traefik está corriendo en otro stack, **no** definir Traefik en este compose
— solo conectar los services a su red y agregar labels.

Puertos abiertos en el firewall: **80**, **443**, **443/udp** (HTTP/3) — ya
abiertos por el stack Traefik existente.

---

## 2. Clonar el repo

```bash
git clone <URL_DEL_REPO> /opt/svi-erp
cd /opt/svi-erp
```

---

## 3. Configurar `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
# Cargar las claves reales: Supabase + MP + (opcional) AFIP cert
chmod 600 .env.production
```

El archivo está organizado en 5 secciones con un checklist final de 8 pasos
pre-deploy. **Leerlo entero** antes del primer build.

---

## 4. Apuntar DNS

Mientras no haya dominio adquirido, los hosts ya apuntan al VPS:

| Subdominio | Tipo | Apunta a |
|---|---|---|
| `svi.srv878399.hstgr.cloud` | A | IP del VPS |
| `svi-erp.srv878399.hstgr.cloud` | A | IP del VPS |

Cuando se adquiera el dominio:

| Subdominio | Tipo | Apunta a |
|---|---|---|
| `svi.com.ar`, `www.svi.com.ar` | A | IP del VPS |
| `app.svi.com.ar` | A | IP del VPS |

Y actualizar `WEB_HOST` / `ADMIN_HOST` en `.env.production`.

---

## 5. Build & Up

```bash
cd /opt/svi-erp
docker compose --env-file .env.production up -d --build
```

Primer build: ~5-8 min (compila ambas apps + descarga imágenes).
Builds posteriores: ~2 min (cache de Docker layers).

Traefik (del stack n8n_evoapi) detecta los labels automáticamente y emite
SSL vía Let's Encrypt al primer request en cada host.

---

## 6. Validar

```bash
# Estado de los 2 services SVI
docker compose ps

# Logs en vivo
docker compose logs -f web
docker compose logs -f admin

# Healthchecks
docker inspect --format='{{.State.Health.Status}}' svi-web
docker inspect --format='{{.State.Health.Status}}' svi-admin

# Verificar que Traefik enruta los hosts
curl -I https://svi.srv878399.hstgr.cloud
curl -I https://svi-erp.srv878399.hstgr.cloud

# Webhook MP (debe devolver 200 con {ok:true, service:...})
curl https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago
```

Acceso humano:
- https://svi.srv878399.hstgr.cloud → landing
- https://svi.srv878399.hstgr.cloud/portal → portal cliente/inversor
- https://svi-erp.srv878399.hstgr.cloud → panel privado interno

---

## 7. Actualizar a una nueva versión

```bash
cd /opt/svi-erp
git pull
docker compose --env-file .env.production up -d --build
# Las apps se reconstruyen sin downtime perceptible (Traefik mantiene la
# versión vieja hasta que la nueva pase healthcheck).
```

Si la actualización trae nueva migration SQL: aplicarla en Supabase Studio
**antes** del `docker compose up` (las apps pueden empezar a llamar columnas
nuevas que aún no existen).

---

## 8. Troubleshooting rápido

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| `502 Bad Gateway` | App caída o sin pasar healthcheck | `docker compose logs web` / `admin` |
| `cert error` | DNS aún no propagado | `dig svi.srv878399.hstgr.cloud` desde el VPS |
| `auth: getUser() returns null` | JWT hook desactivado en Supabase | Ver `supabase/SETUP.md` §2 |
| Server actions fallan con "Sin empresa_id en JWT" | JWT inyecta el claim pero `auth.users.raw_app_meta_data` no — leer JWT directo | Helper ya implementado en `apps/admin/src/lib/auth/claims.ts` |
| Webhook MP devuelve 401 | Firma HMAC inválida (header `x-signature` vs `MP_WEBHOOK_SECRET`) | Verificar que el secret en `.env.production` matchea el del panel MP |
| Build falla por memoria | VPS chico | Buildear localmente y `docker save / docker load` en el VPS |

---

## 9. Backups del repo

El repo en sí no requiere backup (está en git). El VPS solo necesita backup de:
- `.env.production` (rotable, no único)
- Los volumenes de Supabase (ese stack tiene su propia política de backup)

Los certificados SSL los maneja Traefik del stack `n8n_evoapi` — no son
responsabilidad de este compose.

---

## 10. Configurar webhook Mercado Pago (post-deploy)

Una vez que el admin esté arriba con HTTPS:

1. Panel MP → Tu aplicación → **Webhooks** → **Configurar notificaciones**.
2. URL productiva: `https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago`
3. Eventos: marcar **Pagos**.
4. Generar la **clave secreta** y copiarla a `.env.production` como `MP_WEBHOOK_SECRET`.
5. `docker compose --env-file .env.production up -d admin` para que el admin levante con la var.
6. Hacer un pago de prueba con tarjeta de testing y verificar en la DB:

```sql
SELECT * FROM webhook_eventos WHERE proveedor = 'mercadopago' ORDER BY created_at DESC LIMIT 5;
SELECT id, mp_payment_id, mp_status FROM ventas WHERE mp_payment_id IS NOT NULL ORDER BY updated_at DESC LIMIT 5;
```

Detalle del flujo completo en `supabase/SETUP.md` §13.
