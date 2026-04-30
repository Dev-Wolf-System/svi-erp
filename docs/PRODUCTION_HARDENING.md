# 🔒 Hardening pre-producción — SVI ERP/CRM

> Checklist de cosas que **funcionan en desarrollo** pero deben cambiarse antes
> del primer deploy con tráfico real. Se acumula durante Fases 1-9 y se ejecuta
> en bloque durante Fase 10.

---

## 1. Mensajes de error en server actions (toasts)

### Estado actual (desarrollo)

Las server actions devuelven el `error.message` real de Supabase/PostgREST/AFIP/MP
y el cliente lo muestra crudo en el toast:

```ts
// apps/admin/src/modules/ventas/integraciones.ts
if (error || !venta) {
  return { ok: false, error: error?.message ?? "Venta no encontrada" };
}
```

El usuario ve mensajes como:
- `"column empresas.telefono does not exist"`
- `"new row violates row-level security policy for table audit_log"`
- `"PGRST116: JSON object requested, multiple (or no) rows returned"`

**Por qué se hizo así:** acelera el diagnóstico durante desarrollo. Permite
detectar bugs de schema, RLS, FKs, etc., sin tener que abrir logs del server.

### Lo que hay que hacer antes de producción

1. **Mapear códigos de error a mensajes amigables.** Crear helper en
   `apps/admin/src/lib/errors/messages.ts`:

   ```ts
   const MAP: Record<string, string> = {
     PGRST116: "El registro no existe o fue eliminado.",
     "23505": "Ya existe un registro con esos datos (clave duplicada).",
     "42501": "No tenés permisos para realizar esta acción.",
     "23503": "Hay datos relacionados que impiden esta operación.",
   };
   export function userFriendly(error: { code?: string; message: string }) {
     return MAP[error.code ?? ""] ?? "Ocurrió un error. Intentá de nuevo o avisanos si persiste.";
   }
   ```

2. **Enviar el error técnico completo a Sentry** (no perderlo).

   ```ts
   import * as Sentry from "@sentry/nextjs";
   if (error) {
     Sentry.captureException(error, { extra: { ventaId, action: "emitirFacturaAfip" } });
     return { ok: false, error: userFriendly(error) };
   }
   ```

3. **Logging server-side estructurado** con `pino` (request_id + empresa_id +
   user_id en cada log) para que ops pueda buscar el error técnico cruzando con
   el toast amigable que el usuario reportó.

### Archivos afectados (todas las server actions)

- `apps/admin/src/modules/stock/actions.ts`
- `apps/admin/src/modules/clientes/actions.ts`
- `apps/admin/src/modules/bancos/actions.ts`
- `apps/admin/src/modules/leads/actions.ts`
- `apps/admin/src/modules/ventas/actions.ts`
- `apps/admin/src/modules/ventas/integraciones.ts`

---

## 2. Página `/debug/jwt`

Debe **borrarse** antes de producción. Expone los claims del JWT del usuario
logueado. Útil en dev para confirmar que el hook está inyectando, peligroso en
prod.

```bash
rm -rf "apps/admin/src/app/(dashboard)/debug"
```

Y eliminar el item del sidebar si está agregado.

---

## 3. Service Role Key

Solo se usa desde código server (`apps/admin/src/lib/supabase/service.ts`).
Verificar en Fase 10:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` **NO** está en ningún `args:` de Dockerfile
      (si lo está, queda baked en el bundle).
- [ ] No se importa desde ningún componente cliente (`grep -rn "createServiceClient" apps/admin/src/app`
      solo debe matchear server actions o route handlers).

---

## 4. Borrado de seeds y datos de prueba

- [ ] `supabase/_consolidated_schema.sql` incluye seeds de demo al final →
      asegurarse de que la DB de producción NO los tenga (usuarios fake,
      empresa demo, vehículos placeholder).
- [ ] Borrar registros con `email = "demo@svi.com.ar"` o similares.

---

## 5. AFIP — pasar de stub a producción

`AFIP_DRIVER=stub` está bien para operación inicial (genera CAE simulado).
Cuando el certificado AFIP esté tramitado:

1. Implementar `packages/integrations/src/afip/sandbox-driver.ts` y
   `production-driver.ts` (WSAA + WSFEv1).
2. Cambiar `AFIP_DRIVER=production` en `.env.production`.
3. Configurar `AFIP_CERT`, `AFIP_KEY`, `AFIP_PUNTO_VENTA`, `AFIP_CUIT`.
4. Tests de homologación con AFIP_DRIVER=sandbox antes de pasar a production.

Hasta ese momento, los CAE simulados del stub funcionan para ensayar el flujo
pero **no son válidos legalmente**.

---

## 6. Mercado Pago — credenciales productivas

Cambiar las credenciales de `TEST-...` a `APP_USR-...` en `.env.production`:
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET` (clave generada en panel MP → Webhooks)

Configurar webhook URL en el panel MP apuntando a:
`https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago` (F4.5 ✅
implementado — ver `supabase/SETUP.md` §13 para flujo completo).

**En `NODE_ENV=production` la firma HMAC es obligatoria** — sin
`MP_WEBHOOK_SECRET` el handler responde 500. En dev se acepta sin firma.

---

## 7. Rate limiting

Ninguna API route tiene rate limiting hoy. Antes de exponer endpoints
públicos (portal extranet, webhooks):

- [ ] Implementar rate limiting con Upstash Redis o equivalente.
- [ ] Mínimo: 100 req/min por IP en endpoints autenticados, 20 req/min en
      endpoints públicos (login, recuperar contraseña).

---

## 8. CORS y headers de seguridad

Caddy/Traefik ya setean STS, X-Frame, etc. Verificar:

- [ ] CSP estricto (no `unsafe-eval`, no `unsafe-inline` excepto donde Next.js
      lo requiera con nonce).
- [ ] CORS solo desde el propio dominio (apps/web → apps/admin).

---

## 9. 2FA para roles admin

Supabase Auth soporta TOTP. Activar para roles `super_admin` y `admin`:

- [ ] Pantalla de enrolamiento TOTP en primer login de admin.
- [ ] Middleware que rechaza requests de admin sin AAL2.

---

## 10. Backups

- [ ] Cron diario de `pg_dump` en el VPS, retención 30 días.
- [ ] Snapshot del bucket `contratos-pdf` (los contratos firmados son
      legalmente requeridos por 10 años AR).
- [ ] Test de restore mensual (un backup que no se prueba no es backup).

---

## 11. Monitoring

- [ ] Sentry activo (web + admin) con source maps subidos en cada deploy.
- [ ] Health checks externos (UptimeRobot o equivalente) cada 5min.
- [ ] Alertas a WhatsApp/email cuando latencia P95 > 2s o error rate > 1%.

---

## 12. Migrations en orden

Verificar antes del deploy de prod que **todas** las migrations están aplicadas
en la DB de producción y en el orden correcto. Faltantes detectables vía:

```sql
-- En SQL Editor:
SELECT version, name FROM schema_migrations ORDER BY version;  -- si usás supabase migrations
-- o manualmente revisar que las tablas existen:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Migrations actuales (al 2026-04-29):
- 0001-0011: schema base + RLS + cron
- 0012: constraints ventas
- 0013: SECURITY DEFINER en triggers internos
- 0014: mp_init_point en ventas
- 0015: contrato_hash + firma_metodo + contrato_version
- 0016: notas en inversores
- 0017: contrato_hash + version en inversiones
- 0018: liquidaciones recibo + modo retirar/reinvertir
- 0019: aportes adicionales del inversor
- 0020: solicitudes de aporte + modo solicitado por inversor
- 0021: agenda (recursos + disponibilidad + bloqueos + turnos con anti-overlapping)

---

## 13. Cifrado pgsodium para datos bancarios (Fase 5+)

### Estado actual (desarrollo)

Las columnas `inversores.cbu` y `inversores.alias` se guardan **en texto plano**.
La UI ofusca el CBU al mostrarlo (`0110****5678`), pero la DB lo tiene crudo.

**Por qué se hizo así:** la extensión `pgsodium` ya está habilitada en la
migration 0001, pero no se cableó a las columnas sensibles porque el flujo de
keys (Supabase vault, rotación, etc.) requiere planificación operativa que se
posterga a la Fase 5+ (post-dictamen FCI). Hasta entonces, la operación es
interna y de bajo volumen — el riesgo es manejable.

### Lo que hay que hacer antes del primer inversor real

1. **Habilitar key management en Supabase Vault** y registrar una key SVI.
2. **Migración aditiva** que cifra las columnas existentes:
   ```sql
   ALTER TABLE inversores
     ADD COLUMN cbu_encrypted   bytea,
     ADD COLUMN alias_encrypted bytea;

   UPDATE inversores
   SET cbu_encrypted   = pgsodium.crypto_aead_det_encrypt(
                            cbu::bytea, ''::bytea, '<KEY_UUID>'::uuid),
       alias_encrypted = pgsodium.crypto_aead_det_encrypt(
                            alias::bytea, ''::bytea, '<KEY_UUID>'::uuid)
   WHERE cbu IS NOT NULL OR alias IS NOT NULL;

   ALTER TABLE inversores DROP COLUMN cbu, DROP COLUMN alias;
   ALTER TABLE inversores RENAME COLUMN cbu_encrypted TO cbu;
   ALTER TABLE inversores RENAME COLUMN alias_encrypted TO alias;
   ```
3. **VIEW descifradora** con permiso solo a un rol específico
   (`inversores_decrypted`) que joineen `pgsodium.decrypted_columns`.
4. **Actualizar `getInversorById`** para usar la VIEW; `getInversores`
   (lista) no debe traer CBU/alias.
5. **Auditoría**: cada acceso a la VIEW queda en `audit_log`.
6. **Backfill test** — verificar que ningún cliente de la app deja de funcionar.

### Archivos afectados

- `apps/admin/src/modules/inversores/queries.ts` — cambiar el FROM a la VIEW
- `apps/admin/src/modules/inversores/actions.ts` — usar `pgsodium.crypto_aead_det_encrypt`
  al INSERT/UPDATE
- Schema: nueva migration `0016_pgsodium_cbu_alias.sql`

---

## 14. Hardening del Supabase self-hosted

Estos puntos NO son de la app SVI sino del `.env` de Supabase
(`/root/supabase-svi/.env` en el VPS). Detectados al cruzar el `.env` real
contra el código del portal del inversor (F5.6).

### 🚀 Aplicar todo de una con el script

`infra/scripts/harden-supabase-self-hosted.sh` aplica §14.1 + §14.2 + §14.3
de forma idempotente, hace backup del `.env` y reinicia el container `auth`.

```bash
# en el VPS, con la API key de Resend (recomendado para SMTP):
cd /root/svi-erp/infra/scripts
sudo SMTP_PROVIDER=resend SMTP_API_KEY=re_xxxxxxxxxxxx \
  bash harden-supabase-self-hosted.sh

# o sin SMTP por ahora (workaround manual con Add user en Studio):
sudo SMTP_PROVIDER=none bash harden-supabase-self-hosted.sh
```

El script hace smoke test al final y muestra los próximos pasos manuales
(actualizar Studio → Authentication → URL Configuration). Las secciones
14.1-14.3 abajo son la referencia detallada de qué hace cada parte.

### 14.1. SMTP — habilitar antes del primer inversor con portal

**Estado actual** del `.env` del Supabase: `SMTP_HOST=`, `SMTP_USER=`,
`SMTP_PASS=` vacíos.

**Síntomas con SMTP vacío:**
- Crear un usuario en Studio → no se envía email de bienvenida.
- "Invite user" → falla o no llega nada.
- "¿Olvidaste tu clave?" en `/portal/login` → no funciona.
- Confirmación de email post-signup → imposible (queda pendiente para
  siempre).

**Workaround temporal** (válido para los primeros inversores):
- Crear el auth user con `Add user` (no Invite) → auto-confirma.
- Pasar la contraseña inicial por canal externo (WhatsApp/llamada).
- El inversor puede cambiarla después manualmente desde Studio o vía
  `supabase.auth.updateUser({ password })` en el portal (no implementado todavía).

**Solución productiva** — configurar SMTP en
`/root/supabase-svi/.env` y reiniciar el container `auth`:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<RESEND_API_KEY>           # mismo que apps/admin si lo activamos para emails transaccionales
SMTP_SENDER_NAME=SVI
SMTP_ADMIN_EMAIL=devwolf.contacto@gmail.com
```

```bash
cd /root/supabase-svi
docker compose up -d auth
```

Alternativas a Resend: Postmark, SendGrid, o un Gmail con app password.

### 14.2. DISABLE_SIGNUP — cerrar el self-signup

**Estado actual**: `DISABLE_SIGNUP=false` + `ENABLE_EMAIL_SIGNUP=true` →
cualquiera con un POST a `/auth/v1/signup` puede crear cuenta de
auth.users.

**Por qué importa**: el portal del inversor sólo deja entrar a usuarios
**vinculados** a un `inversores.portal_user_id`. Pero un atacante con
la URL del Supabase puede crear cuentas vacías que ensucien
`auth.users` y abran vector para fingerprint del sistema.

**Cambio recomendado pre-producción**:

```env
DISABLE_SIGNUP=true
```

Los inversores y usuarios internos se crean SIEMPRE desde Studio
(`Authentication → Users → Add user`). El operador es el que decide
quién entra.

```bash
cd /root/supabase-svi
docker compose up -d auth
```

### 14.3. ADDITIONAL_REDIRECT_URLS — sumar hosts de producción

**Estado actual**:
```env
ADDITIONAL_REDIRECT_URLS=http://localhost:3000/**,http://localhost:3001/**
```

Sin los hosts de producción, los magic links / reset de password
(cuando se active SMTP) van a redirigir mal y dar "URL no permitida".

**Cambio**:
```env
ADDITIONAL_REDIRECT_URLS=http://localhost:3000/**,http://localhost:3001/**,https://svi.srv878399.hstgr.cloud/**,https://svi-erp.srv878399.hstgr.cloud/**
```

Cuando se compre el dominio definitivo, sumar los nuevos también.

### 14.4. Postgres password en URL externa

El `POSTGRES_PASSWORD` actual contiene `$` al final — debe escaparse como `%24`
cuando se usa en `DATABASE_URL` (de lo contrario el parser de pg lo interpreta
como inicio de variable y lo rompe):

```env
# CORRECTO (con $ escapado)
DATABASE_URL=postgresql://postgres:<password-url-encoded>@supabase-svi.srv878399.hstgr.cloud:5432/postgres

# INCORRECTO (rompe el parser de pg)
DATABASE_URL=postgresql://postgres:<password-con-$-sin-escapar>@supabase-svi.srv878399.hstgr.cloud:5432/postgres
```

⚠️ Adicional: este password **ya quedó expuesto en commits previos** del repo
(commit `0eabbb6` y anteriores). Es **obligatorio rotarlo pre-producción** —
ver §15 para el procedimiento.

Adicional: hoy el puerto 5432 está expuesto al internet. Recomendable
restringirlo por firewall a la IP del VPS o tunelizar por SSH cuando
se necesite. La operación normal de SVI NO necesita conexión directa
a Postgres — todo va por la API de Supabase.

---

## 15. Rotación de secrets compartidos (N8N + MP + Evolution + Postgres)

### ⚠️ Reuso de credencial entre Postgres y Evolution

**Detectado 2026-04-30:** la misma string se usa simultáneamente como:
- `POSTGRES_PASSWORD` del Supabase self-hosted (con `$` final)
- `AUTHENTICATION_API_KEY` global de Evolution API (sin `$`, cargado en
  credential N8N `SVI · Evolution API`)

**Riesgo:** si Evolution API se compromete (RCE, dependencia con CVE), el
atacante obtiene credenciales DB completas. Y viceversa.

**Acción pre-producción** (Fase 10):
1. Rotar `AUTHENTICATION_API_KEY` de Evolution a un valor independiente:
   ```bash
   openssl rand -hex 32  # nuevo apikey Evolution
   ```
   Cambiar en `/root/evolution-api/.env` (o donde corra Evolution) y
   reiniciar el container. Actualizar la credential N8N `SVI · Evolution API`
   con el nuevo valor.
2. Rotar `POSTGRES_PASSWORD` por algo más fuerte y único:
   ```bash
   openssl rand -base64 32 | tr -d '=' | tr '/' '_'
   ```
   Cambiar en `/root/supabase-svi/.env` y propagar al `DATABASE_URL` de SVI.
3. Idealmente, ambos en un secret manager (Vault, Doppler, 1Password CLI)
   en lugar de archivos `.env` planos.

### Estado actual

- `N8N_WEBHOOK_SECRET` (F5.7) y `MP_WEBHOOK_SECRET` (F4.5) son los dos
  secrets compartidos entre SVI y proveedores externos.
- Ambos en `apps/admin/.env.local` (dev) y `.env.production` (prod).
- En N8N el mismo valor está como variable `SVI_N8N_WEBHOOK_SECRET`.
- En MP el mismo valor está en panel → Webhooks → "Clave secreta".

### Política mínima sugerida pre-producción

- **Rotación trimestral** del `N8N_WEBHOOK_SECRET` (bajo riesgo: solo lo
  conocen N8N y SVI, ambos sistemas que controlamos).
- **Rotación semestral** del `MP_WEBHOOK_SECRET` (más fricción: implica
  re-configurar el webhook en el panel MP y reiniciar containers).
- **Rotación inmediata** si se sospecha leak (logs, repo público, employee
  ex-empleado con acceso a panel).

### Procedimiento rotación N8N

1. Generar nuevo secret: `openssl rand -hex 32`.
2. Setear como variable temporal en N8N: `SVI_N8N_WEBHOOK_SECRET_NEW`.
3. Setear en SVI dual-key (si llegamos a implementar acepta-old-or-new):
   ```env
   N8N_WEBHOOK_SECRET=<viejo>
   N8N_WEBHOOK_SECRET_NEXT=<nuevo>
   ```
   (a implementar en `lib/webhooks/n8n-auth.ts` cuando llegue la 1ª rotación).
4. Apuntar workflows N8N al nuevo secret.
5. Confirmar tráfico con el nuevo.
6. Borrar el viejo de SVI y de N8N.

### Procedimiento rotación MP

1. Generar nuevo secret en panel MP.
2. Cambiar en `.env.production` del admin.
3. Reiniciar container `svi-admin`.
4. Reenviar webhooks fallidos desde panel MP (si los hay).

### NUNCA

- Commitear el secret a git (audit con `git-secrets` antes del primer push
  externo).
- Compartir por canales no encriptados (Slack DM OK; email NO).
- Reutilizar el mismo secret entre dev y prod.

---

## 16. Cifrado pgsodium en payloads del agente IA (F8+)

Cuando el agente WhatsApp esté en producción, los mensajes en
`asistente_mensajes.content` y `tool_input/tool_output` pueden contener
datos sensibles (montos, CBU mencionado en chat, fragmentos de DNI).

### Lo que hay que hacer antes de producción del agente

1. Habilitar `pgsodium` (ya está cargado desde 0001).
2. Migración aditiva que cifra columnas:
   ```sql
   ALTER TABLE asistente_mensajes
     ADD COLUMN content_enc      bytea,
     ADD COLUMN tool_input_enc   bytea,
     ADD COLUMN tool_output_enc  bytea;
   -- backfill + drop columnas planas
   ```
3. VIEW `asistente_mensajes_decrypted` con permiso solo a roles autorizados.
4. Auditoría obligatoria de cada SELECT a la VIEW (extender `audit_log`).
5. Doble factor para acceso a la VIEW (admin app: re-auth con TOTP en sesiones
   con +15min de antigüedad).

### Archivos afectados (cuando llegue F8)

- `packages/agent/src/memory.ts` — usar VIEW al leer, encrypt al insertar.
- Schema: nueva migration `0024_pgsodium_asistente_payloads.sql`.

---

*Mantener este archivo vivo durante el desarrollo: cada vez que se haga un
"shortcut" para acelerar dev, agregarlo acá con su contexto.*
