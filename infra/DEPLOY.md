# Deploy a VPS — SVI ERP/CRM

Guía operativa para levantar las apps Next.js en el mismo VPS donde corre Supabase.

---

## 1. Requisitos en el VPS

```bash
# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Verificar
docker --version
docker compose version
```

Puertos abiertos en el firewall: **80**, **443**, **443/udp** (HTTP/3).

> Supabase ya está corriendo en otra red Docker — las apps SVI NO la tocan, solo la consumen vía la URL pública `https://supabase-svi.srv878399.hstgr.cloud`.

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
# Pegar las claves reales de Supabase + N8N + AFIP
chmod 600 .env.production
```

---

## 4. Apuntar DNS

Crear registros A en el panel del dominio:

| Subdominio | Tipo | Apunta a |
|---|---|---|
| `svi.com.ar` | A | IP del VPS |
| `www.svi.com.ar` | A | IP del VPS |
| `app.svi.com.ar` | A | IP del VPS |

---

## 5. Build & Up

```bash
cd /opt/svi-erp
docker compose --env-file .env.production up -d --build
```

Primer build: ~5-8 min (compila ambas apps + descarga imágenes).
Builds posteriores: ~2 min (cache de Docker layers).

---

## 6. Validar

```bash
# Estado de servicios
docker compose ps

# Logs en vivo
docker compose logs -f web
docker compose logs -f admin
docker compose logs -f caddy

# Healthchecks
docker inspect --format='{{.State.Health.Status}}' svi-web
docker inspect --format='{{.State.Health.Status}}' svi-admin
```

Acceso:
- https://svi.com.ar         → landing
- https://svi.com.ar/portal  → portal cliente/inversor
- https://app.svi.com.ar     → panel privado interno

Caddy emite SSL automáticamente vía Let's Encrypt en el primer request.

---

## 7. Actualizar a una nueva versión

```bash
cd /opt/svi-erp
git pull
docker compose --env-file .env.production up -d --build
# Caddy queda intacto; web y admin se reconstruyen sin downtime perceptible
```

---

## 8. Troubleshooting rápido

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| `502 Bad Gateway` | App caída | `docker compose logs web` |
| `cert error` | DNS aún no propagado | `dig svi.com.ar` desde el VPS |
| `auth: getUser() returns null` | JWT hook desactivado | Ver `supabase/SETUP.md` §2 |
| `cookie not found` | URLs distintas dev/prod | Revisar redirect URLs en Studio |
| Build falla por memoria | VPS chico | Buildear localmente y `docker save / docker load` en el VPS |

---

## 9. Backups del repo

El repo en sí no requiere backup (está en git). El VPS solo necesita:
- `.env.production` (rotable, no único)
- `caddy_data` y `caddy_config` (certificados SSL — recuperables, pero ahorran rate-limit de Let's Encrypt)

```bash
# Backup mínimo
tar czf svi-vps-$(date +%F).tar.gz \
  /opt/svi-erp/.env.production \
  $(docker volume inspect svi-erp_caddy_data --format '{{.Mountpoint}}')
```
