# 🔁 N8N — Workflows SVI ERP

> Workflows de automatización SVI. Todos viven en la carpeta **`/personal/SVI-ERP`**
> de la instancia N8N self-hosted (`https://n8n.srv878399.hstgr.cloud`),
> folder ID `CMeS6dONijGgFulq`.
>
> **Decisión arquitectónica:** ver `docs/AGENTE_IA_AGENDA.md`. Los workflows
> de N8N son SOLO conducto y notificación. La lógica de negocio vive en el
> backend SVI (`apps/admin`).

---

## ⚠️ Particularidad — Community Edition

La instancia es **N8N Community**. Esto implica:
- ❌ La API REST **NO** permite gestionar carpetas (folders) → mover
  workflows a `/personal/SVI-ERP` debe hacerse **manualmente desde la UI**
  (3 clicks: abrir workflow → menú ⋯ → Move to folder).
- ❌ No hay feature **Variables** → los valores que un workflow necesita
  inyectar (URLs, números WA, etc.) van **hardcodeados** en el JSON o
  resueltos vía **credentials** (sí soportadas) cuando son secretos.
- ❌ No hay **Projects** → todo cuelga del usuario admin de N8N.

Por eso, los workflows de este repo:
1. **Hardcodean** valores estables (`SVI_ADMIN_URL`, paths, expresiones cron).
2. **Usan credentials de N8N** para secretos rotables (header auth, API keys).
3. **Dejan placeholders explícitos** (ej `REEMPLAZAR_CON_EVOAPI_KEY`) cuando
   un valor depende de credenciales que el owner no compartió todavía.

---

## 📁 Organización en la instancia N8N

```
/personal/SVI-ERP/  (folder id: CMeS6dONijGgFulq)
  01-liquidacion-mensual                 ← F5.7 ✅ workflow id: r56M78ub99tNg3EA
  02-recordatorio-vencimiento-inversion  ← F9 ⚪
  03-recordatorio-turno                  ← F9 ⚪
  04-resumen-diario-owner                ← F9 ⚪
  05-onboarding-inversor                 ← F9 ⚪
  06-conciliacion-mp                     ← F9 ⚪
  07-stock-critico                       ← F9 ⚪
  10-wa-receptor                         ← F8 ⚪ (entrada al agente)
  11-wa-push                             ← F8 ⚪ (salida del agente)
  20-verificar-telefono                  ← F8 ⚪ (OTP de verificación)
```

---

## 📥 Importación: vía API (recomendado) o vía UI

### Vía API (lo que ya hicimos para el 01)

```bash
# Cargar credenciales locales (no commiteadas, .secrets/ está en gitignore)
source .secrets/n8n.env

# Crear el workflow
curl -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  --data @docs/n8n/workflows/personal-svi-erp/01-liquidacion-mensual.json \
  "$N8N_API_URL/workflows"
```

> El JSON del repo está sanitizado: no contiene IDs concretos de credentials,
> solo el `name`. Al importar, hay que asociar el credential `SVI · x-n8n-secret`
> manualmente desde la UI (1 click sobre el HTTP Request → Credential dropdown).

### Vía UI (alternativa)

1. Login en `https://n8n.srv878399.hstgr.cloud`.
2. Sidebar → **Workflows** → `+` → **Import from File**.
3. Seleccionar el JSON desde `docs/n8n/workflows/personal-svi-erp/`.
4. Menú (⋯) → **Move to folder** → `personal/SVI-ERP`.
5. Activar el workflow (toggle del header) — solo cuando esté todo configurado.

---

## 🔐 Credentials N8N

En lugar de Variables (no disponibles en Community), usamos **credentials**
para los secretos. Las credentials son seguras (cifradas, never exported en
JSON) y rotables.

| Credential | Tipo | Uso | Estado |
|---|---|---|---|
| `SVI · x-n8n-secret` | `httpHeaderAuth` (header `x-n8n-secret`) | Auth de los HTTP Request hacia `/api/webhooks/n8n/*` | ✅ Creada |
| `SVI · Evolution API` | `httpHeaderAuth` (header `apikey`) | Auth hacia Evolution API para enviar WhatsApp | ✅ Creada con apikey real |

**Restricciones de dominio**:
- `SVI · x-n8n-secret` → `svi-erp.srv878399.hstgr.cloud`
- `SVI · Evolution API` → `evolution.srv878399.hstgr.cloud`

**Rotación de secrets**: ver `docs/PRODUCTION_HARDENING.md` §15.

---

## 📡 Patrón "destinatarios desde Supabase"

Los workflows N8N **no hardcodean números de WhatsApp del owner**.
En su lugar, el endpoint que llaman (`/api/webhooks/n8n/liquidaciones/run-mensual`,
y los próximos endpoints de F9) devuelve un campo `notificar_a`:

```json
{
  "ok": true,
  "creadas": 23,
  "ya_existian": 0,
  "errores": [],
  "empresas_procesadas": 1,
  "notificar_a": [
    { "nombre": "Pablo Pérez", "telefono_wa": "5491165432123", "email": "..." },
    { "nombre": "Ana López",   "telefono_wa": "5491198765432", "email": "..." }
  ]
}
```

`notificar_a` se construye en SVI consultando `usuario_sucursal_rol` con
roles `super_admin` o `admin`, filtrando por `usuarios.activo` y
`usuarios.telefono IS NOT NULL`. La normalización del teléfono al formato
Evolution (`549...`) la hace `lib/notificaciones/destinatarios.ts`.

**Beneficios:**
- Si cambia el owner o se agrega una segunda persona que reciba alertas,
  no hay que tocar el workflow — solo cambia un registro en `usuarios`.
- Multi-tenant: si SVI hostea a otras empresas en el futuro, cada una
  recibe sus propios admins automáticamente.
- Los teléfonos están en una tabla con RLS, no en variables N8N.

**Cómo lo consume el workflow:**
1. Recibe la respuesta del POST.
2. Pasa por un nodo **`Split Out`** sobre `notificar_a` → cada destinatario
   se vuelve un item independiente.
3. **`Set`** arma el mensaje personalizado (`Hola {{ $json.nombre }}, …`).
4. **HTTP Request → Evolution API** envía un WA por cada item, usando
   `{{ $json.telefono_wa }}` como destino.

Mismo patrón se va a usar en F8 (agente) cuando el agente necesite
"empujar" mensajes a un grupo de admins.

---

## 📌 Lo que falta para activar el workflow 01

| # | Bloqueante | Descripción |
|---|---|---|
| 1 | **Sí** | Mover el workflow `r56M78ub99tNg3EA` a `/personal/SVI-ERP` desde la UI (3 clicks). N8N Community no lo permite vía API. |
| 2 | **Sí** | **Conectar la instancia Evolution `SVI-ERP`**: hoy está `state=close`. UI Evolution Manager → instancia `SVI-ERP` → QR Code → escanear con WA del owner. Sin esto los `sendText` fallan con 400. |
| 3 | **Sí** | Owner / admin con `telefono` cargado en `usuarios`. La query filtra los que no tienen. Si todos están NULL, `notificar_a` viene vacío y nadie recibe el mensaje. |
| 4 | **Sí** | Admin SVI deployado en `https://svi-erp.srv878399.hstgr.cloud`. Hoy responde `HTTP=000` (no levantado). |
| 5 | No | Activar el toggle del workflow (después del test exitoso). |

### Probar el flow de punta a punta

Una vez resueltos 1-4:
1. N8N → abrir el workflow → botón **Execute Workflow** (esquina sup. derecha).
2. Verificar en la cadena de ejecución:
   - **POST run-mensual (SVI)** debe responder `200` con resumen JSON + `notificar_a: [...]`.
   - **Split notificar_a** debe expandir 1+ items.
   - **Evolution → WA admin** debe responder `200` y llegar el mensaje al WA.
3. Verificar en Supabase:
   ```sql
   SELECT external_id, procesado, payload->'resumen', error
   FROM webhook_eventos
   WHERE proveedor = 'n8n' AND external_id LIKE 'liq-mensual:%'
   ORDER BY created_at DESC LIMIT 5;
   ```
4. Si todo verde → activar el toggle. El cron corre a las 07:30 ART del próximo día 1.

---

## 🧪 Probar el workflow 01 manualmente

Antes de esperar al día 1 de mes, podés ejecutarlo manualmente:

```bash
# desde tu terminal local
SECRET="<el_mismo_secret_que_pusiste>"
ADMIN_URL="https://svi-erp.srv878399.hstgr.cloud"

curl -X POST "${ADMIN_URL}/api/webhooks/n8n/liquidaciones/run-mensual" \
  -H "x-n8n-secret: ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respuesta esperada:

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

Reintento inmediato:

```json
{
  "ok": true,
  "deduplicated": true,
  "external_id": "liq-mensual:all:202604"
}
```

(no se duplican liquidaciones — la unique constraint de `webhook_eventos` corta
el reintento; aun si pasara, las propias liquidaciones tienen `external_ref` UNIQUE).

---

## 📋 Workflows actuales

### 01 — Liquidación FCI mensual ✅ (F5.7)

**Archivo:** `01-liquidacion-mensual.json`

**Trigger:** Schedule, día 1 de cada mes, 10:30 UTC (07:30 ART).

**Flujo:**
1. Cron dispara.
2. HTTP POST a `/api/webhooks/n8n/liquidaciones/run-mensual` con `x-n8n-secret`.
3. IF `ok === true` → arma mensaje de resumen → Evolution API → WhatsApp del owner.
4. IF `ok === false` → arma mensaje de error → WhatsApp del owner con stack.

**Idempotencia:** doble — la unique constraint de `webhook_eventos` y la
constraint UNIQUE en `liquidaciones_inversion.external_ref`.

**Retries:** N8N reintenta 3× con 60s de espera entre intentos. Si todos fallan,
el workflow queda marcado como ejecución fallida y dispara `errorWorkflow` (a
configurar en F9).

---

## 🔮 Próximos workflows (F9)

Cada uno tendrá su entrada en este README al ser entregado. Patrón común:

- **Idempotencia obligatoria** vía `webhook_eventos` (proveedor='n8n').
- **Auth** con `x-n8n-secret` para llamadas inbound al admin SVI.
- **Plantillas** en N8N para que el owner pueda tunearlas sin redeploy.
- **Retry policy** consistente (3× con backoff exponencial).

---

*Última actualización: 2026-04-30*
