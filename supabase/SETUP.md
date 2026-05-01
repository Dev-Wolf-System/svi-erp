# Setup Supabase self-hosted — SVI

Guía paso a paso para inicializar el proyecto contra `https://supabase-svi.srv878399.hstgr.cloud`.

---

## 1. Aplicar el schema (DDL)

1. Ir a Studio → **SQL Editor**: `https://supabase-svi.srv878399.hstgr.cloud/project/default/sql`
2. Abrir el archivo local `supabase/_consolidated_schema.sql` (1197 líneas).
3. Pegar **todo** y ejecutar.
4. Validar resultado: `tabla 'numeracion_correlativos' creada`, `tabla 'webhook_eventos' creada`, etc.

> ⚠️ El archivo incluye los seeds de demo al final. Si **no** querés datos de prueba, borrá la sección "SEEDS DE DEMO" antes de ejecutar.

---

## 2. Activar el JWT Claims Hook (CRÍTICO)

Sin este paso, las RLS no reciben `empresa_id` y todas las queries devuelven 0 filas.

### Opción A — desde el Studio
1. Ir a **Authentication → Hooks** (o **Auth Hooks**).
2. Buscar **Custom Access Token Hook**.
3. Habilitar y elegir la función PostgreSQL `public.custom_access_token_hook`.
4. Guardar.

### Opción B — Supabase self-hosted (VPS con docker-compose)

**Atención:** en self-hosted hay que tocar **dos archivos** del directorio de Supabase:

**1. Editar el `.env` de Supabase** (ej: `/root/supabase-svi/.env`) y agregar:

```env
GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED=true
GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI=pg-functions://postgres/public/custom_access_token_hook
```

**2. Editar el `docker-compose.yml` del servicio `auth`** para que esas dos vars lleguen al contenedor (Compose NO las pasa automáticamente, solo las usa para sustituir `${...}`):

```yaml
auth:
  ...
  environment:
    GOTRUE_API_HOST: 0.0.0.0
    ...
    GOTRUE_SMS_AUTOCONFIRM: ${ENABLE_PHONE_AUTOCONFIRM}

    # ↓↓↓ AGREGAR ↓↓↓
    GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED: ${GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED}
    GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI: ${GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI}
```

**3. Aplicar los cambios** (usar `up -d`, no solo `restart`):

```bash
cd /root/supabase-svi
docker compose up -d auth
```

**4. Verificar que el contenedor recibió las vars:**

```bash
docker compose exec auth env | grep -i hook
# debe mostrar las dos GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_*
```

**5. Verificar que el hook se ejecuta sin error en el siguiente login:**

```bash
docker compose logs auth --tail=50 | grep -iE "hook|error"
# si hay "Hook errored out" → ver mensaje SQLSTATE para diagnosticar
```

---

## 3. Crear el primer usuario admin

```sql
-- 1. Crear el usuario en auth.users (desde Studio → Authentication → Users → Invite)
--    o vía SQL directo (cuidado: este patrón requiere SERVICE_ROLE_KEY):

-- Después, registrarlo en `usuarios` con la empresa y sucursal:
INSERT INTO usuarios (id, empresa_id, nombre, apellido, email, activo)
VALUES (
  '<UUID_DEL_USUARIO_RECIEN_CREADO>',
  '00000000-0000-0000-0000-000000000001',
  'Matías',
  'Díaz',
  'devwolf.contacto@gmail.com',
  true
);

INSERT INTO usuario_sucursal_rol (usuario_id, sucursal_id, rol_id, es_principal)
VALUES (
  '<MISMO_UUID>',
  '00000000-0000-0000-0000-000000000010',  -- Aguilares
  '00000000-0000-0000-0000-000000000020',  -- super_admin
  true
);
```

---

## 4. Configurar redirect URLs

Esto se setea en `/root/supabase-svi/.env` del VPS (variable
`ADDITIONAL_REDIRECT_URLS`) y/o en **Studio → Authentication → URL
Configuration**.

```
Site URL: https://svi-erp.srv878399.hstgr.cloud   (admin prod)

Redirect URLs (combinación de dev + prod):
  http://localhost:3000/**                          (web local)
  http://localhost:3001/**                          (admin local)
  https://svi.srv878399.hstgr.cloud/**              (web prod — portal extranet)
  https://svi-erp.srv878399.hstgr.cloud/**          (admin prod — ERP)
```

Si activás portal del inversor (F5.6) sin `https://svi.srv878399.hstgr.cloud/**`
en redirect URLs, los magic links / reset de password fallan con
"URL no permitida". Ver `docs/PRODUCTION_HARDENING.md §14.3`.

---

## 5. Verificar conexión desde la app

```bash
# Desde la raíz del repo
npm run dev
```

- Web: http://localhost:3000
- Admin: http://localhost:3001/login

Ingresá con el usuario que creaste en el paso 3. Si redirige al `/dashboard` sin error, el JWT hook está funcionando.

### Troubleshooting: `npm run dev` no arranca (WSL2 sobre `/mnt/`)

Si trabajás en Windows con WSL2 y el repo vive en `/mnt/d/...`, npm puede crear los binarios de `node_modules/.bin/` como archivos vacíos (0 bytes). Síntoma: `npm run dev` retorna instantáneamente con exit 0 sin output.

Diagnóstico:
```bash
ls -la node_modules/.bin/next   # si dice "0" en el size, está roto
```

Fix:
```bash
npm rebuild --bin-links
```

El `postinstall` del root `package.json` ya detecta este caso y lo arregla automáticamente después de `npm install`.

---

## 6. Storage — buckets

Si vas a subir fotos de vehículos, crear los buckets en **Storage**:

```sql
-- Vía SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vehiculos-fotos', 'vehiculos-fotos', true),
  ('contratos-pdf',   'contratos-pdf',   false),
  ('comprobantes',    'comprobantes',    false);

-- Policies básicas (vehiculos-fotos público para landing)
CREATE POLICY "vehiculos_fotos_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehiculos-fotos');

CREATE POLICY "vehiculos_fotos_upload_admin" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehiculos-fotos'
    AND auth.role() = 'authenticated'
  );
```

---

## 7. pg_cron — verificar jobs

```sql
SELECT * FROM cron.job;
-- Deben aparecer: 'liberar-reservas-vencidas' y 'liquidacion-fci-mensual'
```

Si no aparecen, asegurate de que la extensión `pg_cron` esté habilitada (la migración `0001_extensions_and_enums.sql` la habilita, pero algunas instalaciones requieren intervención manual).

---

## 8. Diagnóstico — página de debug del JWT

El admin incluye una página interna para verificar que los claims llegan bien:

```
http://localhost:3001/debug/jwt
```

Muestra el contenido de `user.app_metadata`, intenta una query a `vehiculos` y reporta el resultado. Útil para validar que el hook JWT está activo y la RLS deja pasar los datos.

**Borrar antes de producción** (`apps/admin/src/app/(dashboard)/debug/`).

---

## 9. Bug conocido del hook (FIXED en migration 0003)

Si crearon el hook con una versión vieja de `0003_jwt_claims_hook.sql`, podía fallar con:

```
ERROR: function min(uuid) does not exist (SQLSTATE 42883)
```

Causa: PostgreSQL no tiene `MIN(uuid)` nativo. Solucionado en commit `6ee00fc` separando el cálculo de `sucursal_ppal` en un SELECT aparte. Si ya tenían la función vieja desplegada, re-ejecutar la versión actualizada de `supabase/migrations/0003_jwt_claims_hook.sql` (o el `_consolidated_schema.sql` regenerado).

---

## 10. Storage buckets

### Bucket `contratos-pdf` (privado) — F4

Necesario antes de generar el primer contrato de venta. Studio → Storage:

1. **New bucket** → Name: `contratos-pdf` → Public: **OFF**
2. File size limit: `5 MB`
3. Allowed MIME types: `application/pdf`

O por SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contratos-pdf', 'contratos-pdf', false, 5242880, ARRAY['application/pdf']);
```

No requiere policies de `storage.objects` — el código usa `createServiceClient()`
(service_role) que bypassa RLS por diseño. Las descargas se sirven con signed
URLs de 1h, no `getPublicUrl`.

### Bucket `vehiculos-fotos` (público) — F3

Pendiente. Cuando se conecte la subida de fotos del módulo stock.

### Bucket `recibos-liquidacion` (privado) — F5.4.1

Necesario antes del primer pago de liquidación con recibo. Studio → Storage:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recibos-liquidacion', 'recibos-liquidacion', false, 5242880, ARRAY['application/pdf']);
```

Path por archivo: `{empresa_id}/{inversion_id}/{liquidacion_id}.pdf`. Cada
liquidación tiene UN solo recibo (no se versiona — corregir requiere anular
y regenerar). El upload usa `upsert: true` para tolerar regeneraciones tras
errores transitorios.

### Bucket `contratos-fci` (privado) — F5.5

Necesario antes de generar el primer contrato FCI. Studio → Storage:

1. **New bucket** → Name: `contratos-fci` → Public: **OFF**
2. File size limit: `5 MB`
3. Allowed MIME types: `application/pdf`

O por SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contratos-fci', 'contratos-fci', false, 5242880, ARRAY['application/pdf']);
```

Mismo patrón que `contratos-pdf` (ventas): no requiere policies de
`storage.objects` porque el código usa `createServiceClient()` para subir
y `createSignedUrl(60*60)` para servir. Path versionado e inmutable:
`{empresa_id}/{inversion_id}/{numero_contrato}-vN.pdf`.

---

## 11. Migrations aplicadas (al 2026-05-01)

```
0001_extensions_and_enums.sql       ✅
0002_core_tables.sql                ✅
0003_jwt_claims_hook.sql            ✅
0004_numeracion_atomica.sql         ✅
0005_clientes_y_leads.sql           ✅
0006_vehiculos.sql                  ✅
0007_inversiones_fci.sql            ✅
0008_ventas_y_bancos.sql            ✅
0009_caja.sql                       ✅
0010_rls_policies.sql               ✅
0011_cron_jobs.sql                  ✅
0012_ventas_constraints.sql         ✅  (F4 — checks parte_pago/financiado, snapshot comisión)
0013_security_definer_internals.sql ✅  (F4.1 — fix RLS audit_log + numeracion)
0014_mp_init_point.sql              ✅  (F4.5 — persistir init_point MP)
0015_contrato_hash_y_firma_metodo.sql ✅ (F4.6 — autenticidad PDF: hash + firma_metodo + version)
0016_inversores_notas.sql           ✅  (F5.1 — campo notas en inversores)
0017_inversiones_contrato_hash.sql  ✅  (F5.5 — autenticidad PDF FCI: hash + version)
0018_liquidaciones_recibo_y_modo.sql ✅ (F5.4.1 — modo retirar/reinvertir + recibo PDF)
0019_inversion_aportes.sql          ✅  (F5.4.3 — aportes adicionales del inversor)
0020_solicitudes_aporte_y_modo_solicitado.sql ✅ (F5.6 — portal extranet inversor)
0021_agenda.sql                     ✅  (F7.1 — recursos + disponibilidad + bloqueos + turnos + pg_notify)
0022_ai_chat_sessions.sql           ✅  (F6.G — sesiones + mensajes chat IA con RLS, enum ai_chat_role, trigger touch)
0023_ai_token_usage.sql             ✅  (F6.G — tracking de costos OpenAI + vista ai_usage_current_month)
0024_pgvector_embeddings.sql        ✅  (F6.G — extensión vector + ai_embeddings (1536 dims) + RPC ai_search_similar KNN cosine)
```

### Migraciones de capa IA (F6.G+)

Aplicar en este orden vía SQL Editor:

- **`0022_ai_chat_sessions.sql`** — sesiones + mensajes de chat IA con RLS por user/empresa
- **`0023_ai_token_usage.sql`** — auditoría de costos OpenAI + vista `ai_usage_current_month`
- **`0024_pgvector_embeddings.sql`** — extensión `vector` + tabla `ai_embeddings` (1536 dims) + RPC `ai_search_similar` (KNN cosine)

⚠️ Antes de aplicar 0024, verificá que pgvector esté disponible:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

Si no devuelve fila, instalalo en el VPS:
```bash
docker exec supabase-db apt update
docker exec supabase-db apt install -y postgresql-15-pgvector
docker compose restart db
```

Después la migration 0024 corre limpia.

---

## 12. Próximos pasos

- ✅ Schema aplicado (0001-0013)
- ✅ Hook JWT activo
- ✅ Usuario admin creado
- ✅ Stock + Clientes + Leads + Bancos + Ventas conectados a DB real (F3 + F4)
- ✅ Bucket `contratos-pdf` creado
- ✅ Webhook `/api/webhooks/mercadopago` (F4.5) — ver §13
- ⏳ Configurar bucket `vehiculos-fotos` para fotos de stock
- ⏳ Inversiones FCI (F5)

---

## 13. Webhook Mercado Pago (F4.5)

Endpoint: `POST /api/webhooks/mercadopago` en el admin.

### Flujo
1. **Firma HMAC-SHA256**: si `MP_WEBHOOK_SECRET` está seteado, el handler valida
   el header `x-signature` contra el manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
   En `NODE_ENV=production` la firma es **obligatoria**; en dev se acepta sin
   firma para facilitar pruebas con curl.
2. **Idempotencia**: INSERT en `webhook_eventos` con `(proveedor='mercadopago',
   external_id='<type>:<data.id>')`. La constraint UNIQUE (`uniq_webhook`) evita
   duplicados. Si MP reenvía el mismo evento → respuesta `200 {deduplicated:true}`
   sin tocar la venta.
3. **Routing**: para eventos `type=payment`, el handler hace `payment.get(id)` al
   SDK de MP y parsea `external_reference` con formato `tipo:sucursal_id:referencia_id`.
4. **Update**: si el tipo es `venta_seña` o `venta_saldo`, actualiza
   `ventas.mp_payment_id`, `mp_status` (no cambia `estado` automáticamente —
   eso lo decide el operador).
5. **Marca procesado**: `procesado=true, procesado_at=NOW()` al final. Si hubo
   error, persiste `error` y devuelve 500 → MP reintenta.

### Configuración MP (panel)
Una vez deployado, en https://www.mercadopago.com.ar/developers/panel:
1. Ir a la app → **Webhooks** → **Configurar notificaciones**.
2. URL productiva: `https://svi-erp.srv878399.hstgr.cloud/api/webhooks/mercadopago`
3. Eventos: marcar **Pagos**.
4. Generar la **clave secreta** y copiarla a `.env.production` como `MP_WEBHOOK_SECRET`.

### Test manual desde CLI (dev)
```bash
curl -X POST http://localhost:3001/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-req-1" \
  -d '{"type":"payment","action":"payment.created","data":{"id":"123456789"},"date_created":"2026-04-28T00:00:00Z"}'
# En dev sin MP_WEBHOOK_SECRET responderá 200 (saltea HMAC).
# El payment.get fallará si el id no existe — el evento queda registrado en webhook_eventos con error.
```

### GET /api/webhooks/mercadopago
Devuelve `{ok:true, service:"mercadopago_webhook"}` — útil para verificar que
la ruta está enrutada correctamente por el reverse proxy.

---

## 14. Autenticidad del contrato PDF (F4.6)

Cada PDF generado lleva un **sello de integridad** impreso en el footer de
cada hoja: SHA-256 del payload canónico + QR a la URL pública de verificación
+ logo SVI. Permite probar a cualquier tercero que el documento no fue alterado.

### Flujo
1. Al generar el PDF, `renderContratoVenta` calcula `computeContratoHash(data)`
   sobre los campos legalmente relevantes (precio, vehículo, cliente, dominio,
   etc — NO sobre teléfono/email/notas que pueden cambiar sin que el contrato
   sea otro).
2. El hash se imprime con formato `XXXX:XXXX` + URL `https://<host>/v/<numero_op>` +
   QR. Aparece en cada hoja vía `<View fixed>`.
3. `ventas.contrato_hash` y `ventas.contrato_version` se persisten al subir el PDF.
4. La página pública `/v/<numero_op>` (sin auth) recalcula el hash desde la DB,
   lo compara con el persistido y muestra **✓ Auténtico** o **✗ No coincide**.
5. La página ofusca DNI/CUIT (formato `30****56`) y NO muestra
   teléfono/email/dirección/banco/comisión.

### Estado legal
Es **autenticidad técnica** (anti-tamper sin terceros), no firma legal bajo
Ley 25.506. El campo `ventas.firma_metodo` (default `'presencial'`) sirve de
slot para sumar firma electrónica externa después (TokenSign, ZapSign, etc)
sin rediseño.

### Tests
- `packages/pdf/src/contrato-venta/__tests__/canonical.test.ts` — 14 tests
  cubren determinismo, normalización de fechas/decimales, exclusión de campos
  no legales, sensibilidad a cambios reales.
- `render.test.ts` valida que `verifyBaseUrl` agrega el sello.

### Cómo desactivar el sello (preview interna sin hash)
`renderContratoVenta(data, { /* sin verifyBaseUrl */ })` → cae al footer legacy.
Útil para imprimir borradores que no quieren ir a la página pública.

---

## 17. Webhook N8N — liquidación FCI mensual (F5.7)

### Endpoint expuesto

```
POST /api/webhooks/n8n/liquidaciones/run-mensual
Headers:
  x-n8n-secret: <N8N_WEBHOOK_SECRET>
  Content-Type: application/json
Body (opcional):
  {
    "periodo": "YYYY-MM",         // default: mes actual
    "empresa_ids": [uuid, ...]    // default: todas
  }
```

### Flujo

1. Verifica `x-n8n-secret` (en producción es obligatorio).
2. Inserta en `webhook_eventos` con `proveedor='n8n'` y
   `external_id='liq-mensual:<empresa_csv|all>:<YYYYMM>'`. La unique constraint
   atrapa reintentos → 200 `{ deduplicated: true }`.
3. Llama a `generarLiquidacionesMesActual({ mode: 'system', empresaIds })` que
   recorre todas las inversiones activas y crea las liquidaciones del mes
   (idempotente vía `external_ref` UNIQUE en `liquidaciones_inversion`).
4. Persiste el resumen `{ creadas, ya_existian, errores, empresas_procesadas }`
   en `webhook_eventos.payload.resumen` y marca `procesado=true`.
5. Devuelve el resumen al caller (N8N).

### Configurar en producción

1. Generar el secret:
   ```bash
   openssl rand -hex 32
   ```
2. Cargar en `apps/admin/.env.production` → `N8N_WEBHOOK_SECRET=<valor>`.
3. Cargar el MISMO valor en N8N como variable `SVI_N8N_WEBHOOK_SECRET`.
4. Reiniciar el container del admin: `docker compose up -d svi-admin`.
5. Importar el workflow `docs/n8n/workflows/personal-svi-erp/01-liquidacion-mensual.json`
   en N8N → mover a carpeta `/personal/SVI-ERP` → activar.

Detalle de import + variables N8N en `docs/n8n/README.md`.

### Test manual con curl

```bash
SECRET="<el_secret>"
ADMIN_URL="https://svi-erp.srv878399.hstgr.cloud"

curl -X POST "${ADMIN_URL}/api/webhooks/n8n/liquidaciones/run-mensual" \
  -H "x-n8n-secret: ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respuesta:
```json
{
  "ok": true,
  "deduplicated": false,
  "periodo": "202604",
  "creadas": 23,
  "ya_existian": 0,
  "errores": [],
  "empresas_procesadas": 1
}
```

Ver registros del run:
```sql
SELECT external_id, procesado, payload->'resumen' AS resumen, error, created_at
FROM webhook_eventos
WHERE proveedor = 'n8n' AND external_id LIKE 'liq-mensual:%'
ORDER BY created_at DESC
LIMIT 10;
```

### Por qué N8N y no pg_cron

El cálculo de intereses con redondeo half-even vive en `@repo/utils/calculos-fci`
(52 tests Vitest). Replicarlo en PL/pgSQL forzaría mantener dos fuentes de
verdad para el mismo redondeo. El cron pg_notify de la migration 0011 sigue
disponible como tracer de auditoría (emite `svi_jobs` el día 1) pero NO ejecuta
el cálculo.

---

## 18. Agenda (F7) — schema + anti-overlapping + pg_notify

### Migration

`supabase/migrations/0021_agenda.sql` agrega la extensión `btree_gist` (necesaria
para el `EXCLUDE` con `uuid + tstzrange`) y crea:

| Tabla | Para qué |
|---|---|
| `agenda_recursos` | Owner / asesor / vendedor / sala con tipo, color y vínculo opcional a `usuarios` |
| `agenda_disponibilidad` | Franjas semanales recurrentes con `slot_minutos` (15/20/30/45/60/90/120) |
| `agenda_bloqueos` | Excepciones puntuales (vacaciones, feriados) |
| `agenda_turnos` | Instancias concretas con persona interna o externa |

### Anti-overlapping garantizado por DB

```sql
CONSTRAINT no_overlap_turnos_vivos
  EXCLUDE USING gist (
    recurso_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado IN ('solicitado', 'confirmado'))
```

Si la app intenta crear un turno que pisa otro vivo en el mismo recurso,
PostgreSQL responde con código `23P01` (`exclusion_violation`). El módulo
`apps/admin/src/modules/agenda/actions.ts` lo mapea a un mensaje claro al
usuario: *"El recurso ya tiene un turno solicitado/confirmado en ese horario."*

Cancelados / cumplidos / no_show NO bloquean (solo `solicitado` y `confirmado`).

### Trigger pg_notify

```sql
PERFORM pg_notify('svi_agenda', json_build_object(...));
```

Dispara en `INSERT` y en `UPDATE` de columnas `estado`, `inicio`, `fin`,
`modalidad`. El payload incluye `op`, `turno_id`, `empresa_id`, `recurso_id`,
`estado`, `inicio`, `fin`, `persona_tipo`, `persona_id`, `changed_at`.

**Consumido por:** workflow N8N `agenda-google-sync` (a entregar en F7.5)
para sincronizar con el Google Calendar del owner. También va a alimentar
los recordatorios T-1d / T-1h del agente WA (F9).

### Test rápido del trigger

```sql
-- Conexión 1
LISTEN svi_agenda;
-- (esperar)

-- Conexión 2
INSERT INTO agenda_turnos (
  empresa_id, recurso_id, persona_tipo, externo_nombre,
  inicio, fin, motivo, creado_por
) VALUES (
  '<EMPRESA_ID>', '<RECURSO_ID>', 'externo', 'Test',
  NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 30 minutes',
  'test del trigger', 'sistema'
);

-- Conexión 1 debería recibir notification con el payload JSON.
```

### RLS

Las cuatro tablas están bajo RLS por `empresa_id` (mismo patrón del resto):
- `agenda_recursos` y `agenda_turnos` filtran por `auth.empresa_id()` directo.
- `agenda_disponibilidad` y `agenda_bloqueos` heredan vía sub-select sobre
  `agenda_recursos` (las dos tablas no tienen `empresa_id` propio, solo
  `recurso_id`).

### Lo que falta dentro de F7

- F7.4: selector real de cliente/inversor/lead en alta de turno (hoy es UUID manual).
- F7.5: workflow N8N `agenda-google-sync` consumiendo `pg_notify('svi_agenda')`.
- F7.6: drag & drop para reagendar desde el calendario.
- F7.7: vistas mensual y de día simple.
