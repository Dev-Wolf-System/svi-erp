# 🤖 Agente IA conversacional + Agenda — Arquitectura

> Documento vivo. Captura las decisiones de arquitectura tomadas el 2026-04-30
> para el agente conversacional sobre WhatsApp y el módulo de Agenda que el
> agente consume.
>
> Estado al 2026-04-30:
> - **F7 Agenda — base completa ✅** (migration 0021 + módulo + UI calendario semanal)
> - **F7.5 Sync Google Calendar — ⚪ pendiente** (workflow N8N consume `pg_notify('svi_agenda')`)
> - **F8 Agente IA read-only — 🔜 próximo**
> - **F8.5 Agente write — pendiente**
> - **F8.6 Agente owner/secretaria — pendiente**
> - **F9 Workflows proactivos — pendiente**

---

## 1. Decisión arquitectónica clave

> **El cerebro del agente vive en el backend SVI (`packages/agent` + Claude API
> con tool use). N8N es solo el conducto WhatsApp ↔ HTTP y los workflows
> proactivos de notificación.**

**Por qué NO en N8N:**
- Tool use multi-turn de Claude requiere control fino de tipos, validación
  Zod, retries y manejo de errores → vive mucho mejor en TS.
- Autorización por rol (inversor solo ve lo suyo) **no se delega a N8N**:
  queda dentro del backend con RLS y `getSviClaims` extendido a actores no-web.
- Tests unitarios del agente, versionado en git, code review.
- Si el canal cambia (web/Telegram/SMS), el agente no se reescribe.

**Qué hace N8N:**
- Recibir webhook de Evolution API → reenviar a `/api/agente/chat`.
- Workflows proactivos (recordatorio turno, vencimiento inversión, etc.) que
  invocan `/api/agente/push` con plantilla + destinatario.
- Plantillas y horarios que un no-dev pueda tocar sin redeploy.

---

## 2. Diagrama de flujo

```
WhatsApp del usuario
       ↓
Evolution API (red docker n8n_evoapi)
       ↓ webhook
N8N "wa-receptor"  (carpeta /personal/SVI-ERP)
       ↓ HTTP POST con x-n8n-secret
apps/admin: POST /api/agente/chat
       ├─ identificar usuario por número (lookup en inversores/clientes/usuarios.telefono)
       ├─ cargar últimos N msgs (asistente_mensajes) + perfil del actor
       ├─ Claude API (tool use) con tools FILTRADAS por rol
       │     └─ tools llaman a queries/actions internas con auth del rol
       ├─ persistir tool_calls + response (asistente_mensajes + audit_log)
       └─ devolver texto al N8N
       ↓
N8N → Evolution API → WhatsApp del usuario
```

---

## 3. Roles y matriz de tools

| Rol | Identificado por | Acceso |
|---|---|---|
| **Lead/anónimo** | número WA sin match en DB | Tools públicas: info empresa, simulador, agendar turno comercial |
| **Cliente** | `clientes.telefono` con `telefono_verificado_at IS NOT NULL` | Sus ventas, cuotas, turnos |
| **Inversor** | `inversores.telefono` con `telefono_verificado_at IS NOT NULL` | Sus inversiones, liquidaciones, contratos, turnos |
| **Owner/Admin** | `usuarios.telefono` + rol `admin` + PIN sesión activo | Todo lo operativo + agenda CRUD + envío msgs a inversores/clientes |
| **Secretaria** | `usuarios.telefono` + rol `secretaria` + PIN sesión activo | Subset del owner: lectura de KPIs + agenda CRUD |

### Matriz de tools

| Tool | Lead | Cliente | Inversor | Owner | Secretaria |
|---|:-:|:-:|:-:|:-:|:-:|
| `infoEmpresa()` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `simularInversion(monto, plazo)` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `agendarTurno(motivo, fechaPref)` | ✅ | ✅ | ✅ | — | — |
| `consultarMisInversiones()` | — | — | ✅ | — | — |
| `consultarLiquidacionesPendientes()` | — | — | ✅ | — | — |
| `consultarMiContrato(numero)` | — | — | ✅ | — | — |
| `decidirModoLiquidacion(id, retirar\|reinvertir)` | — | — | ✅* | — | — |
| `solicitarAporteAdicional(monto)` | — | — | ✅* | — | — |
| `cancelarTurno(id)` | — | ✅* | ✅* | ✅ | ✅ |
| `consultarMisVentas()` | — | ✅ | — | — | — |
| `consultarCuotasPendientes()` | — | ✅ | — | — | — |
| `kpisDelDia()` | — | — | — | ✅ | ✅ |
| `ventasDelMes()` | — | — | — | ✅ | ✅ |
| `liquidacionesPendientesGlobal()` | — | — | — | ✅ | ✅ |
| `stockCritico()` | — | — | — | ✅ | ✅ |
| `agendaDisponibilidad(rango)` | — | — | — | ✅ | ✅ |
| `crearTurno(personaId, fecha, motivo)` | — | — | — | ✅ | ✅ |
| `reagendarTurno(id, nuevaFecha)` | — | — | — | ✅ | ✅ |
| `bloquearAgenda(desde, hasta, motivo)` | — | — | — | ✅ | ✅ |
| `enviarMensajeInversor(id, plantilla)` | — | — | — | ✅ | — |
| `enviarMensajeCliente(id, plantilla)` | — | — | — | ✅ | — |

(*) Tools marcadas con asterisco requieren **doble confirmación** en el
chat ("¿Confirmás X? respondé SI / NO") antes de ejecutarse, y quedan
loggeadas en `audit_log` con el `session_id` del WA.

---

## 4. Seguridad — checklist obligatorio

| Riesgo | Mitigación |
|---|---|
| Suplantación por número WA | Match estricto contra DB. Sin match → respuesta genérica + "registrate". |
| Datos financieros expuestos | Antes de mostrar info sensible, challenge "confirmá últimos 4 del DNI/CUIT". 1×/sesión 24h. |
| Acción write involuntaria | Confirmación explícita SI / NO. Audit log con confirm_token. |
| Spam/abuse | Rate limit por número WA: 30 msg/min, 200/día. |
| Owner/secretaria suplantado | Rol interno requiere `usuarios.telefono` + rol correcto + **PIN de sesión** (6 dígitos, 8h, generado desde admin app). |
| Logs con datos sensibles | Payloads de mensajes en `asistente_mensajes` cifrados con `pgsodium` (F10 hardening). |
| Inyección de prompt | System prompt blindado: el agente NUNCA ejecuta tools fuera del whitelist por rol. Validación de output JSON estructurado donde aplique. |

---

## 5. Identidad telefónica

Migration `0023_telefono_verificado.sql`:

```sql
ALTER TABLE inversores ADD COLUMN telefono_verificado_at timestamptz;
ALTER TABLE clientes   ADD COLUMN telefono_verificado_at timestamptz;
ALTER TABLE usuarios   ADD COLUMN telefono_verificado_at timestamptz;

CREATE UNIQUE INDEX idx_inversores_telefono_verificado
  ON inversores(telefono) WHERE telefono_verificado_at IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_clientes_telefono_verificado
  ON clientes(telefono)   WHERE telefono_verificado_at IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_usuarios_telefono_verificado
  ON usuarios(telefono)   WHERE telefono_verificado_at IS NOT NULL;
```

**Flujo de verificación:**
1. Owner / inversor / cliente carga su número desde la app/portal.
2. SVI manda código OTP por WhatsApp vía Evolution API (workflow N8N
   `verificar-telefono.json` en F8).
3. Usuario responde con el código en el chat WA.
4. Si match, se setea `telefono_verificado_at = NOW()`.
5. A partir de ahí, el agente puede identificarlo cuando escriba.

---

## 6. Módulo Agenda — schema implementado (F7 ✅)

> ✅ Implementado en migration `supabase/migrations/0021_agenda.sql` y módulo
> `apps/admin/src/modules/agenda/`. El SQL real puede tener campos adicionales
> (`color`, `notas`, `external_ref`, audit de cancelación). Esto es la versión
> arquitectónica resumida.

```sql
-- 0021_agenda.sql

CREATE TYPE agenda_recurso_tipo AS ENUM ('owner', 'asesor', 'sala');
CREATE TYPE agenda_turno_estado AS ENUM ('solicitado', 'confirmado', 'cumplido', 'cancelado', 'no_show');
CREATE TYPE agenda_turno_modalidad AS ENUM ('presencial', 'videollamada', 'telefono');
CREATE TYPE agenda_persona_tipo AS ENUM ('cliente', 'inversor', 'lead', 'externo');

CREATE TABLE agenda_recursos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id),
  sucursal_id     uuid REFERENCES sucursales(id),
  tipo            agenda_recurso_tipo NOT NULL,
  nombre          text NOT NULL,
  usuario_id      uuid REFERENCES usuarios(id),  -- si tipo=owner/asesor
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE agenda_disponibilidad (   -- recurring weekly
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id      uuid NOT NULL REFERENCES agenda_recursos(id) ON DELETE CASCADE,
  dia_semana      smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),  -- 0=domingo
  hora_inicio     time NOT NULL,
  hora_fin        time NOT NULL CHECK (hora_fin > hora_inicio),
  slot_minutos    smallint NOT NULL DEFAULT 30 CHECK (slot_minutos IN (15, 30, 45, 60, 90, 120)),
  vigente_desde   date,
  vigente_hasta   date
);

CREATE TABLE agenda_bloqueos (         -- excepciones puntuales
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id      uuid NOT NULL REFERENCES agenda_recursos(id) ON DELETE CASCADE,
  desde           timestamptz NOT NULL,
  hasta           timestamptz NOT NULL CHECK (hasta > desde),
  motivo          text
);

CREATE TABLE agenda_turnos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id),
  recurso_id      uuid NOT NULL REFERENCES agenda_recursos(id),
  persona_tipo   agenda_persona_tipo NOT NULL,
  persona_id     uuid,                                  -- nullable si externo sin registrar
  externo_nombre  text,                                  -- para 'externo' o lead sin id
  externo_telefono text,
  inicio          timestamptz NOT NULL,
  fin             timestamptz NOT NULL CHECK (fin > inicio),
  estado          agenda_turno_estado NOT NULL DEFAULT 'solicitado',
  modalidad       agenda_turno_modalidad NOT NULL DEFAULT 'presencial',
  motivo          text NOT NULL,
  notas           text,
  creado_por      text NOT NULL,                         -- 'usuario:<id>' | 'agente_wa' | 'web' | 'sistema'
  external_ref    text UNIQUE,                           -- idempotencia desde el agente
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  EXCLUDE USING gist (
    recurso_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado IN ('solicitado', 'confirmado'))
);

CREATE INDEX idx_turnos_recurso_inicio ON agenda_turnos(recurso_id, inicio)
  WHERE estado IN ('solicitado', 'confirmado');
CREATE INDEX idx_turnos_persona       ON agenda_turnos(persona_tipo, persona_id)
  WHERE persona_id IS NOT NULL;
```

**Triggers:**
- `pg_notify('svi_agenda', json)` cuando se crea/cambia un turno → N8N
  consume y manda confirmación + recordatorios.

**RLS:** las cuatro tablas tienen RLS por `empresa_id` igual que el resto del
proyecto, con la excepción de que `agenda_turnos` permite SELECT al
`persona_id` correspondiente (vía claim del JWT del portal).

---

## 7. Memoria del agente

```sql
-- 0022_asistente_conversaciones.sql

CREATE TYPE asistente_actor_tipo AS ENUM ('lead', 'cliente', 'inversor', 'usuario');
CREATE TYPE asistente_msg_role  AS ENUM ('user', 'assistant', 'tool', 'system');

CREATE TABLE asistente_conversaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid NOT NULL REFERENCES empresas(id),
  canal               text NOT NULL DEFAULT 'whatsapp',
  actor_tipo          asistente_actor_tipo NOT NULL,
  actor_id            uuid,                                  -- nullable si lead
  telefono            text NOT NULL,
  ultimo_mensaje_at   timestamptz NOT NULL DEFAULT NOW(),
  challenge_ok_at     timestamptz,                           -- challenge DNI/CUIT vigente hasta +24h
  pin_session_until   timestamptz,                           -- solo roles internos
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_telefono_canal ON asistente_conversaciones(telefono, canal);

CREATE TABLE asistente_mensajes (
  id              bigserial PRIMARY KEY,
  conversacion_id uuid NOT NULL REFERENCES asistente_conversaciones(id) ON DELETE CASCADE,
  role            asistente_msg_role NOT NULL,
  content         text,
  tool_name       text,
  tool_input      jsonb,
  tool_output     jsonb,
  tokens_in       int,
  tokens_out      int,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_conv_created ON asistente_mensajes(conversacion_id, created_at DESC);
```

Cada vuelta de conversación carga los últimos 20 msgs como contexto para
Claude. Más allá de eso se compacta a un resumen.

---

## 8. Stack del agente

```
packages/agent/                          [NUEVO en F8]
  src/
    index.ts            — handleMessage(input) -> response
    claude.ts           — wrapper Anthropic SDK con prompt caching
    tools/
      index.ts          — registry { rol → [tools] }
      consultar-mis-inversiones.ts
      crear-turno.ts
      ...
    memory.ts           — load/save asistente_mensajes
    auth.ts             — phoneToActor(phone) → { rol, actor_id, empresa_id }
    confirm.ts          — flujo SI/NO 2-step
    rate-limit.ts
  tests/
```

**Modelo:** Claude Sonnet 4.6 con prompt caching obligatorio. System prompt
+ tools + perfil del usuario son 1 cache breakpoint → costo cae ~70%.
Flag `AGENT_MODEL` permite subir a Opus 4.7 en flujos críticos.

---

## 9. Definiciones — estado de alineación

### Resueltas

1. **Agenda multi-recurso desde día 1** — ✅ confirmado. Migration 0021
   incluye los 4 tipos: `owner`, `asesor`, `vendedor`, `sala`. La UI permite
   crear N recursos con color e icono propio.
2. **Slots y horarios default** — ✅ confirmado. Slot default 30 min, formulario
   de disponibilidad pre-rellena L-V 9-18 (modificable por recurso). Slots
   permitidos: 15/20/30/45/60/90/120 min (CHECK constraint en DB).
3. **Sync Google Calendar del owner** — ✅ pospuesto a **F7.5** (sub-fase
   posterior a F8). El trigger `pg_notify('svi_agenda', ...)` ya está activo
   y emite el payload listo para que un workflow N8N lo consuma.

### Pendientes (afectan F8/F8.5/F8.6)

4. **Secretaria:** ¿usuario interno con login propio en `apps/admin`, o solo
   opera por WA con número distinto? **(pendiente)**

   *Recomendación:* usuario interno con login propio + número WA registrado.
   El login admin sirve para gestión visual de la agenda y altas masivas;
   el agente WA es para operación rápida sobre la marcha.

5. **PIN de sesión WA para roles internos:** ¿OK con 6 dígitos / 8h, o más
   fuerte? **(pendiente)**

   *Recomendación:* PIN de 6 dígitos válido 8h por sesión (~1 PIN por jornada
   laboral). Generación desde admin app. Reduce friccón vs TOTP/2FA real
   pero impide que un número WA filtrado actúe sin desafío explícito.

6. **Modelo Claude por defecto:** Sonnet 4.6 (recomendado) o Opus 4.7 desde
   día 1? **(pendiente)**

   *Recomendación:* arrancar con **Claude Sonnet 4.6** (relación calidad/costo
   óptima para tool use). Flag `AGENT_MODEL` en el package permite escalar a
   Opus 4.7 puntualmente para roles owner o flujos de alto valor.

Las 3 pendientes se pueden definir cuando arranquemos F8 — no bloquean F7.

---

*Última actualización: 2026-04-30. Sincronizar con `ROADMAP_DESARROLLO.md` en cada cambio.*
