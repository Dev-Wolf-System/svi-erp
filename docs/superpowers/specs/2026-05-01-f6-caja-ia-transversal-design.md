# F6 + IA Transversal — Design Spec

**Fecha:** 2026-05-01
**Autor:** Dev-Wolf (con asistencia Claude Code)
**Estado:** Aprobado para implementación
**Reemplaza/Extiende:** Migration `0009_caja.sql`, `apps/admin/src/modules/caja/*` (commit `1a28d43`)

---

## 1. Resumen ejecutivo

Este documento define dos cosas inseparables:

1. **F6 — Módulo Caja a nivel sistema de gestión empresarial** (no MVP)
2. **Capa IA transversal** que se construye una vez y se replica en todos los módulos del ERP

El producto SVI no es un ERP/CRM SaaS tradicional — es un **sistema de gestión inteligente con IA embebida en cada módulo**. La capa de IA es de primera clase, no un add-on.

El bloque que se construye primero es **Bloque G (capa IA transversal)** porque sienta los cimientos para todos los demás módulos. Después se aplica al módulo Caja como prueba de fuego, y luego se replica en ventas, inversiones, liquidaciones, bancos, etc.

---

## 2. Visión y principios rectores

### 2.1 Principios de gestión empresarial (memoria `feedback-modulos-financieros`)

Todo módulo donde haya flujo de dinero (caja, ventas, inversiones, liquidaciones, bancos, solicitudes-aporte) debe construirse a **nivel sistema de gestión empresarial completo**, no MVP.

Mínimo obligatorio:
- Información rica: gráficos de tendencia, comparativas, top categorías, distribución
- Filtros y búsqueda: rango fechas, tipo, categoría, moneda, usuario, concepto
- Multi-moneda: ARS y USD separados, tipo de cambio histórico
- Multi-sucursal: selector + vista global consolidada (rol con `view_global`)
- Reportes exportables: Excel/CSV + PDF (arqueo, cierre del día, libro IVA)
- Auditoría inmutable: tabla `auditoria_log` con quién/cuándo/qué
- Alertas/anomalías: saldo negativo, montos atípicos, días sin cerrar
- Detalle por entidad: `/[modulo]/[id]` con timeline completo
- Seguridad reforzada: 2FA en acciones sensibles, rate limiting, RLS estricto, soft delete

### 2.2 Principios de IA transversal (memoria `feedback-ia-transversal`)

Cada módulo debe tener IA embebida como capa de primera clase. Mínimo obligatorio por módulo:

1. **AI Insights Widget** — 3-5 insights del día/semana en lenguaje natural (cache 24h)
2. **Detección de anomalías** — z-score / IQR + LLM para explicar
3. **Categorización automática** — concepto → categoría sugerida
4. **Forecast/predicción** — proyección basada en histórico
5. **Reporte con narrativa** — PDF generado con análisis IA, no solo tablas
6. **Asistente conversacional** — chat embebido con contexto del módulo

Capa global:
- Asistente flotante con acceso a TODOS los datos del usuario
- Búsqueda semántica con embeddings + pgvector
- Analista IA background vía n8n cron
- Reportes ejecutivos automáticos (semanal/mensual)

---

## 3. Stack técnico

### 3.1 Inteligencia Artificial

| Componente | Elección | Justificación |
|---|---|---|
| **LLM principal** | OpenAI `gpt-5-mini` | Default. Balance precio/calidad para insights, asistente, anomalías. |
| **LLM barato** | OpenAI `gpt-5-nano` | Alta frecuencia, baja complejidad: categorización auto, sugerencias inline. |
| **LLM premium** | OpenAI `gpt-5` | Uso esporádico: reportes ejecutivos mensuales, análisis cross-módulo. |
| **Embeddings** | OpenAI `text-embedding-3-small` | Búsqueda semántica, ~$0.02 / millón tokens. |
| **Vector DB** | pgvector en Supabase | Sin servicio externo, RLS funciona igual. |
| **Cache** | Redis (Upstash) | Insights cache 24h, rate limiting por usuario. |
| **Orquestación cron** | n8n (ya en infra) | Insights diarios, reportes mensuales, alertas WhatsApp. |
| **Notificaciones** | Evolution API (WhatsApp) + Resend (email) | Ya integrado. |

### 3.2 Variables de entorno requeridas

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_DEFAULT_MODEL=gpt-5-mini
OPENAI_CHEAP_MODEL=gpt-5-nano
OPENAI_PREMIUM_MODEL=gpt-5
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Existentes (ya configurados)
N8N_WEBHOOK_SECRET=
N8N_BASE_URL=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
RESEND_API_KEY=
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 4. Arquitectura de archivos

```
apps/admin/src/
├── modules/
│   ├── ai/                              # Capa IA transversal — Bloque G
│   │   ├── client.ts                    # Wrapper OpenAI con selector de modelo
│   │   ├── insights.ts                  # Generación de insights con cache
│   │   ├── anomalies.ts                 # Detección estadística + explicación LLM
│   │   ├── categorize.ts                # Categorización con prompts por módulo
│   │   ├── forecast.ts                  # Predicciones temporales
│   │   ├── chat.ts                      # Sesiones de chat persistidas
│   │   ├── embeddings.ts                # Generación + búsqueda semántica
│   │   ├── audit.ts                     # Logging de tokens consumidos
│   │   ├── rate-limit.ts                # Rate limiting por usuario
│   │   ├── schemas.ts                   # Zod schemas (input/output IA)
│   │   └── prompts/
│   │       ├── system-base.md           # Prompt base del asistente global
│   │       ├── caja.md                  # Contexto módulo caja
│   │       ├── ventas.md                # (futuro)
│   │       ├── inversiones.md           # (futuro)
│   │       └── ...
│   │
│   ├── caja/                            # Módulo caja — F6
│   │   ├── schemas.ts                   # ✅ ya existe
│   │   ├── queries.ts                   # ✅ ya existe — extender
│   │   ├── actions.ts                   # ✅ ya existe — extender
│   │   ├── ai.ts                        # NUEVO — wrappers IA específicos de caja
│   │   ├── analytics.ts                 # NUEVO — agregaciones para gráficos
│   │   ├── exports.ts                   # NUEVO — Excel/PDF
│   │   └── alerts.ts                    # NUEVO — detección de anomalías
│   │
│   └── auditoria/                       # Auditoría transversal — Bloque E
│       ├── schemas.ts
│       ├── queries.ts
│       └── log.ts                       # Helper para registrar eventos
│
├── components/
│   ├── ai/
│   │   ├── ai-insights-widget.tsx       # <AiInsightsWidget moduleKey="caja" />
│   │   ├── ai-chat-floating.tsx         # Asistente flotante global (topbar)
│   │   ├── ai-anomaly-badge.tsx         # Badge inline cuando hay anomalía
│   │   ├── ai-suggest-input.tsx         # Input con autosugerencia IA
│   │   ├── ai-forecast-chart.tsx        # Chart con línea de proyección IA
│   │   └── ai-narrative-block.tsx       # Bloque de texto generado por IA
│   │
│   └── shared/                          # Componentes nuevos compartidos
│       ├── date-range-picker.tsx        # Para filtros de fechas
│       ├── kpi-card.tsx                 # KPI con sparkline y delta %
│       ├── empty-state.tsx
│       └── data-table.tsx               # Tabla con paginación + sort + virtualization
│
└── app/
    ├── api/
    │   └── ai/
    │       ├── insights/route.ts
    │       ├── chat/route.ts
    │       ├── analyze/route.ts
    │       ├── forecast/route.ts
    │       ├── categorize/route.ts
    │       ├── anomalies/route.ts
    │       └── report/route.ts
    │
    └── (dashboard)/
        └── caja/
            ├── page.tsx                 # Dashboard ejecutivo (refactor)
            ├── analytics/page.tsx       # Vista analítica completa
            ├── auditoria/page.tsx       # Audit log de operaciones
            ├── reportes/page.tsx        # Generación de reportes
            ├── movimientos/
            │   ├── page.tsx             # Lista filtrable completa
            │   ├── [id]/page.tsx        # Detalle individual con timeline
            │   └── nuevo/                # ✅ ya existe
            └── chat/                    # Chat embedded (alternativa al flotante)
                └── page.tsx

supabase/migrations/
├── 0009_caja.sql                        # ✅ ya existe
├── 0022_auditoria_log.sql               # NUEVO — audit trail global
├── 0023_pgvector_embeddings.sql         # NUEVO — pgvector + embeddings
├── 0024_ai_chat_sessions.sql            # NUEVO — sesiones de chat
├── 0025_ai_token_usage.sql              # NUEVO — tracking de costos
├── 0026_caja_anulacion_audit.sql        # NUEVO — campos anulado_* en movimientos_caja
└── 0027_caja_alerts.sql                 # NUEVO — alertas configurables
```

---

## 5. Patrones de IA estándar (los 6)

### P1 — AI Insights Widget

**Qué hace:** Genera 3-5 insights en lenguaje natural sobre el estado actual del módulo, basándose en datos del último día/semana/mes.

**Implementación:**
- Endpoint: `POST /api/ai/insights` con body `{ moduleKey, scope, contextData }`
- LLM: `gpt-5-mini`
- Cache: Redis 24h, key `ai:insights:{userId}:{moduleKey}:{scope}:{date}`
- Refresh manual: bypass cache vía query param `?fresh=1`
- Output: `{ insights: [{ severity: 'info'|'warn'|'success'|'critical', icon, title, description, action?: { label, href } }] }`

**UX:**
- Componente `<AiInsightsWidget moduleKey="caja" />`
- Loader skeleton mientras genera
- Cada insight tiene icono semántico + color según severity
- Botón "🔄 Refrescar" en header
- Botón "Ver más" abre modal con análisis detallado

**Ejemplos para Caja:**
- ✅ "Día con saldo positivo de $245.300, 18% mayor al promedio del mes"
- ⚠️ "Egresos en `gasto_operativo` aumentaron 23% esta semana"
- 🔴 "Tu caja tiene 3 días sin cerrar — el último cierre fue el 28/04"
- 💡 "Detectamos un movimiento de $89.000 con concepto similar a uno de ayer — ¿podría ser duplicado?"

### P2 — Detección de anomalías

**Qué hace:** Identifica valores fuera de rango histórico y genera explicación legible.

**Implementación:**
1. **Capa estadística:** calcular media, desvío estándar, p25/p75/IQR sobre últimos 30 días
2. **Detector:** flag si `|valor - media| > 2.5 * stddev` (o fuera del IQR ajustado)
3. **Capa LLM:** `gpt-5-mini` con prompt: "Este movimiento fue clasificado como anómalo: {datos}. Explicá en 1 frase si parece un error de carga, una operación legítima atípica, o algo a investigar."
4. Cache 1h por entidad analizada

**UX:**
- `<AiAnomalyBadge severity="warn" reason="..." />` inline en filas de tabla
- Tooltip con explicación al hover
- Click → modal con detalle y acciones (marcar como ok, anular, investigar)

### P3 — Categorización automática

**Qué hace:** Al escribir el concepto, sugiere la categoría más probable.

**Implementación:**
- Endpoint: `POST /api/ai/categorize` con body `{ moduleKey, text, candidateCategories }`
- LLM: `gpt-5-nano` (es alta frecuencia, debe ser barato)
- Cache: Redis 7 días, key `ai:cat:{hash(text)}`
- Output: `{ suggested: "categoria_value", confidence: 0.0-1.0, alternatives: [...] }`
- Si confidence < 0.6, mostrar "no estoy seguro, elegí manualmente"

**UX:**
- En el form de nuevo movimiento: debounce 600ms al escribir concepto
- Si llega sugerencia con confidence ≥ 0.8: pre-selecciona la categoría con un badge "🤖 sugerido"
- El usuario puede sobrescribir; si lo hace, se loguea para futuro fine-tuning

### P4 — Forecast / predicción

**Qué hace:** Proyecta saldo / cash flow a fin de mes basándose en tendencia histórica.

**Implementación:**
- Endpoint: `POST /api/ai/forecast` con body `{ moduleKey, metric, lookbackDays, horizonDays }`
- Algoritmo: regresión lineal simple sobre últimos 30 días (suficiente para empezar; mejorable después con Prophet o ARIMA)
- LLM: `gpt-5-mini` para narrativa: "Si la tendencia se mantiene, tu saldo a fin de mes será aproximadamente $X."
- Cache: 4h

**UX:**
- `<AiForecastChart historical={...} forecast={...} />` — extiende el área chart con línea punteada para el forecast + banda de confianza

### P5 — Asistente conversacional

**Qué hace:** Chat con contexto del módulo (o global si es el flotante de topbar).

**Implementación:**
- Endpoint: `POST /api/ai/chat` con body `{ sessionId, message, contextScope }`
- LLM: `gpt-5-mini` con tools/function-calling para queries SQL controladas
- Persistencia: tabla `ai_chat_sessions` + `ai_chat_messages` con RLS
- Streaming: Server-Sent Events para respuesta progresiva
- Tools disponibles (RBAC-checked):
  - `query_movimientos(filters)` → solo registros del usuario
  - `query_ventas(filters)` → si tiene `ventas.view`
  - `generate_chart(type, data)` → devuelve JSON renderizable
  - `export_pdf(reportType)` → genera PDF y devuelve URL

**UX:**
- Flotante: botón en topbar abre panel lateral 400px
- Embebido: página `/caja/chat` para conversaciones largas
- Sugerencias rápidas (chips): "Resumen de hoy", "Top egresos del mes", "¿Cuánto gasté en proveedores?"
- Soporte markdown + tablas + gráficos inline

### P6 — Reporte con narrativa

**Qué hace:** Genera PDF con análisis ejecutivo (no solo datos crudos).

**Implementación:**
- Endpoint: `POST /api/ai/report` con body `{ moduleKey, reportType, period }`
- LLM: `gpt-5-mini` para narrativa standard, `gpt-5` para reportes mensuales ejecutivos
- Generador PDF: `@react-pdf/renderer` (server-side)
- Almacenamiento: Supabase Storage bucket `reports/`
- Auditoría: registrar cada generación en `auditoria_log`

**UX:**
- Página `/caja/reportes` con grid de tipos de reporte
- Selector de período (mes, trimestre, custom)
- Vista previa antes de generar
- Botón "Generar y descargar"
- Histórico de reportes generados

---

## 6. Plan F6 de Caja por bloques

### Bloque G — Capa IA transversal ⚡ PRIORIDAD MÁXIMA

**Por qué primero:** sienta los cimientos para todos los módulos del ERP.

**Entregables:**
- Migrations 0023, 0024, 0025
- `modules/ai/` completo (client, insights, anomalies, categorize, forecast, chat, embeddings, rate-limit)
- Componentes `<AiInsightsWidget>`, `<AiChatFloating>`, `<AiAnomalyBadge>`, `<AiSuggestInput>`, `<AiForecastChart>`
- Endpoints `/api/ai/{insights, chat, analyze, forecast, categorize, anomalies, report}`
- Rate limiting + token usage tracking
- Asistente flotante integrado en topbar
- Tests de smoke para cada endpoint

### Bloque A — Dashboard ejecutivo de Caja con IA

**Entregables:**
- Refactor `/caja/page.tsx` con:
  - Gráfico de área: saldo acumulado últimos 30 días (Recharts)
  - Donut: distribución por categoría (mes en curso)
  - KPIs con delta % (vs ayer, vs mes anterior)
  - Top 5 categorías con barras horizontales
- `<AiInsightsWidget moduleKey="caja" />` integrado
- Anomaly badges en KPIs cuando aplique
- Forecast chart (saldo proyectado a fin de mes)

### Bloque B — Filtros, búsqueda y movimientos completos

**Entregables:**
- Página `/caja/movimientos` (lista completa filtrable)
- Range picker de fechas con presets
- Filtros multi-select (tipo, categoría, moneda, usuario)
- Búsqueda por concepto (debounced 300ms)
- Búsqueda semántica vía embeddings ("movimientos parecidos a este")
- Búsqueda en lenguaje natural via IA: "egresos de combustible este mes" → traduce a filtros
- Paginación + virtualización (>100 items)
- Persistencia de filtros en URL

### Bloque C — Multi-moneda + multi-sucursal

**Entregables:**
- Selector de sucursal en topbar (dropdown)
- Vista global "Todas las sucursales" para `caja.view_global`
- Migration `0028_tipo_cambio.sql` — tabla de TC histórico
- Conversión USD → ARS en saldo consolidado
- KPIs separados ARS / USD
- Cron n8n: descarga TC del BCRA diariamente

### Bloque D — Reportes con narrativa IA

**Entregables:**
- Página `/caja/reportes` con grid de tipos
- PDF arqueo del día con resumen IA
- PDF cierre detallado por categoría
- Excel/CSV export de movimientos filtrados
- Reporte mensual automático vía n8n cron → email
- Comparativa mes vs mes con análisis IA de variaciones

### Bloque E — Auditoría + seguridad reforzada

**Entregables:**
- Migration `0022_auditoria_log.sql` (append-only con trigger)
- Migration `0026_caja_anulacion_audit.sql` (campos anulado_* en movimientos_caja)
- Capturar en log: registrar/anular/cerrar/modificar (quién, cuándo, IP, payload diff)
- Confirmación 2-step para cerrar caja con monto > umbral
- Pre-requisito 2FA para cerrar caja (cuando MFA esté implementado)
- Rate limiting en server actions de caja (Upstash Redis)
- Página `/caja/auditoria` para roles `admin`+ con timeline filtrable

### Bloque F — Detalles y UX inteligente

**Entregables:**
- Página `/caja/movimientos/[id]` con timeline + acciones
- Edición de comprobante post-registro
- Categorización automática IA en form (P3)
- Detección de duplicado en tiempo real
- Empty states con CTAs claros
- Skeleton loaders en queries
- Toast con "deshacer" en anulación (5s)
- Atajos de teclado: `n` = nuevo, `c` = cerrar día, `/` = búsqueda

---

## 7. Visión por módulo — Patrones IA aplicables

| Módulo | P1 Insights | P2 Anomalías | P3 Categorización | P4 Forecast | P5 Asistente | P6 Reporte |
|---|---|---|---|---|---|---|
| **Caja** | Resumen del día | Egreso atípico | Concepto → categoría | Saldo proyectado | ✅ | Arqueo + cierre mensual |
| **Ventas** | Pipeline health | Deal estancado | Notas → etiqueta | Cierre mensual | ✅ | Forecast trimestral |
| **Stock** | Top productos | Quiebre próximo | — | Demanda | ✅ | Reposición |
| **Inversiones** | Performance FCI | Liquidación atípica | — | Rendimiento | ✅ | Performance mensual |
| **Inversores** | LTV | Comportamiento | Perfil de riesgo | Re-inversión | ✅ | Estado de cuenta |
| **Liquidaciones** | Mes consolidado | Variación >X% | — | Mes siguiente | ✅ | Liquidación mensual |
| **Bancos** | Conciliación | Movimiento sospechoso | Auto-match | Cash flow | ✅ | Conciliación mensual |
| **Clientes/Leads** | Hot leads | Churn risk | Lead scoring | Conversión | ✅ | Embudo |
| **Agenda** | Productividad | Patrón no-show | — | Mejor horario | ✅ | Eficiencia vendedor |

---

## 8. Migrations requeridas

### 8.1 Bloque G (capa IA)

**`0023_pgvector_embeddings.sql`**
- Habilita extensión `vector`
- Tabla `embeddings_movimientos`: `(id, entity_type, entity_id, embedding vector(1536), content, created_at)`
- Índice IVFFlat / HNSW para búsqueda KNN
- RLS por `empresa_id`

**`0024_ai_chat_sessions.sql`**
- Tabla `ai_chat_sessions`: `(id, user_id, empresa_id, scope, title, created_at, updated_at)`
- Tabla `ai_chat_messages`: `(id, session_id, role, content, tokens_in, tokens_out, created_at)`
- RLS estricto

**`0025_ai_token_usage.sql`**
- Tabla `ai_token_usage`: `(id, user_id, empresa_id, endpoint, model, tokens_in, tokens_out, cost_usd, created_at)`
- Para tracking de costos por usuario/módulo

### 8.2 Bloque E (auditoría)

**`0022_auditoria_log.sql`**
- Tabla `auditoria_log`: `(id, empresa_id, user_id, entity_type, entity_id, action, payload_before jsonb, payload_after jsonb, ip, user_agent, created_at)`
- Trigger genérico para tablas críticas
- Append-only (sin UPDATE/DELETE permitidos vía RLS)

**`0026_caja_anulacion_audit.sql`**
- ALTER TABLE `movimientos_caja` ADD `anulado_por uuid`, `anulado_at timestamptz`, `motivo_anulacion text`
- Backfill desde `deleted_at` existente

**`0027_caja_alerts.sql`**
- Tabla `caja_alertas_config`: `(empresa_id, sucursal_id, tipo, umbral, activa)`
- Para configurar umbrales de anomalía por empresa

### 8.3 Bloque C (multi-moneda)

**`0028_tipo_cambio.sql`**
- Tabla `tipo_cambio_diario`: `(fecha, moneda_from, moneda_to, valor, fuente, created_at)`
- PRIMARY KEY (fecha, moneda_from, moneda_to)

---

## 9. Endpoints de IA — contratos detallados

### `POST /api/ai/insights`
```typescript
Request:  { moduleKey: string, scope: 'day'|'week'|'month', fresh?: boolean }
Response: {
  insights: Array<{
    severity: 'info' | 'warn' | 'success' | 'critical',
    icon: string,
    title: string,
    description: string,
    action?: { label: string, href: string }
  }>,
  generatedAt: string,
  cached: boolean
}
```

### `POST /api/ai/chat`
```typescript
Request: { sessionId?: string, message: string, contextScope: 'global' | string }
Response: SSE stream of:
  - { type: 'token', delta: string }
  - { type: 'tool_call', name: string, args: object }
  - { type: 'tool_result', name: string, result: any }
  - { type: 'done', sessionId: string, tokensUsed: number }
```

### `POST /api/ai/categorize`
```typescript
Request:  { moduleKey: string, text: string, candidateCategories: string[] }
Response: { suggested: string, confidence: number, alternatives: Array<{ value: string, confidence: number }> }
```

### `POST /api/ai/anomalies`
```typescript
Request:  { moduleKey: string, scope: object, threshold?: number }
Response: { anomalies: Array<{ entityId: string, severity, reason: string, value: number, expectedRange: [number, number] }> }
```

### `POST /api/ai/forecast`
```typescript
Request:  { moduleKey: string, metric: string, lookbackDays: number, horizonDays: number }
Response: { forecast: Array<{ date: string, value: number, lower: number, upper: number }>, narrative: string }
```

### `POST /api/ai/report`
```typescript
Request:  { moduleKey: string, reportType: string, period: { from: string, to: string }, format: 'pdf' | 'excel' }
Response: { url: string, expiresAt: string }
```

### `POST /api/ai/analyze`
```typescript
Request:  { moduleKey: string, query: string, contextData?: any }
Response: { answer: string, citations?: Array<{ entityId, snippet }>, charts?: Array<...> }
```

---

## 10. Modelo de costos y control

### 10.1 Estimación inicial (1 empresa, 5 usuarios activos)

| Endpoint | Modelo | Calls/día | Tokens promedio | Costo/mes USD |
|---|---|---|---|---|
| `/insights` | gpt-5-mini | ~25 (5 user × 5 módulos) | 800 in / 400 out | ~$3-5 |
| `/categorize` | gpt-5-nano | ~50 | 200 in / 50 out | ~$0.50 |
| `/chat` | gpt-5-mini | ~30 | 1500 in / 500 out | ~$5-8 |
| `/anomalies` | gpt-5-mini | ~10 | 1000 in / 200 out | ~$1-2 |
| `/forecast` | gpt-5-mini | ~15 | 800 in / 300 out | ~$2 |
| `/report` (mensual) | gpt-5 | 1 | 5000 in / 2000 out | ~$2-3 |
| `embeddings` | text-embedding-3-small | ~100 | 500 tokens | ~$0.10 |

**Total estimado:** ~$15-25 USD/mes por empresa pequeña. Escalable.

> Nota: precios reales de gpt-5-mini en 2026 varían — calcular con cifras actuales al momento de implementar.

### 10.2 Controles obligatorios

- **Rate limiting por usuario:** 100 requests/hora por endpoint, configurable
- **Cache agresivo:** insights 24h, categorize 7d, forecast 4h
- **Token budget por empresa:** alerta si >$50/mes, hard stop si >$100 (configurable)
- **Logging completo:** tabla `ai_token_usage` con cost_usd calculado al guardar
- **Dashboard de uso:** página `/admin/ia-usage` con gráfico de costos por módulo/usuario

---

## 11. Seguridad y compliance

### 11.1 Datos sensibles

- **Nunca enviar a OpenAI:** DNI completo, CBU, CUIT, números de tarjeta — sanitizar en helpers
- **Embeddings:** OK enviar texto descriptivo, NO datos personales identificables
- **Logs de IA:** ofuscar PII al guardar tokens consumidos
- **Política de retención:** chats > 90 días se borran automáticamente (configurable por empresa)

### 11.2 RBAC en endpoints IA

Cada endpoint valida `claims.rol` y aplica scope:
- `caja.view_propia` → solo movimientos del usuario
- `caja.view_global` → toda la empresa
- `inversiones.view` → restringido por defecto

Las "tools" del chat usan los mismos permisos que las queries normales (no bypass).

### 11.3 Auditoría

Toda interacción con IA queda registrada en `ai_token_usage`:
- usuario que pidió
- endpoint y módulo
- modelo usado
- tokens y costo
- IP y user agent
- timestamp

Y las acciones críticas (cerrar caja, anular movimiento, etc.) en `auditoria_log` independientemente de si fueron iniciadas por humano o IA.

---

## 12. Pre-requisitos de infraestructura

| Requisito | Estado | Acción |
|---|---|---|
| `OPENAI_API_KEY` | ✅ Provista por cliente | Validar saldo y rate limit |
| Upstash Redis (free tier) | ❌ No creado | Crear cuenta, obtener `UPSTASH_REDIS_REST_URL` + `TOKEN` |
| pgvector en Supabase self-hosted | ⚠️ Verificar | Confirmar que extensión está habilitada o instalable |
| Supabase Storage bucket `reports/` | ❌ No creado | Crear bucket con políticas RLS |
| n8n cron jobs | ✅ Infra existe | Crear nuevos workflows: insights diarios, reportes mensuales |

---

## 13. Roadmap de ejecución

| Bloque | Estimación | Dependencias | Prioridad |
|---|---|---|---|
| **G — Capa IA transversal** | 4-6 días | OpenAI key + Upstash + pgvector | 🔴 P0 — Bloqueante |
| **A — Dashboard Caja con IA** | 2-3 días | G | 🟠 P1 |
| **B — Filtros + búsqueda** | 2 días | G | 🟠 P1 |
| **E — Auditoría** | 2 días | — (independiente) | 🟠 P1 — Replicable a otros módulos |
| **D — Reportes con narrativa** | 2-3 días | G + E | 🟡 P2 |
| **C — Multi-moneda/sucursal** | 2-3 días | — | 🟡 P2 — Si aplica |
| **F — UX inteligente** | 1-2 días | G + B | 🟢 P3 — Pulido |

**Total Caja completo:** ~16-22 días de desarrollo intensivo.

**Replicación a otros módulos** (ventas, inversiones, etc.): ~3-5 días por módulo (la capa IA ya está hecha).

---

## 14. Criterios de aceptación de F6

Para considerar Caja "production-ready":

- [ ] Todos los bloques A-G implementados y funcionando
- [ ] AI Insights Widget muestra ≥3 insights relevantes en página principal
- [ ] Categorización automática funciona con ≥80% precisión en muestras de prueba
- [ ] Detección de anomalías genera ≥1 alerta válida en datos reales
- [ ] PDF de arqueo del día se genera correctamente con narrativa IA
- [ ] Auditoría registra TODAS las operaciones (registrar/anular/cerrar/modificar)
- [ ] Filtros + búsqueda semántica devuelven resultados correctos
- [ ] Rate limiting evita >100 requests/h por usuario
- [ ] Costo por empresa pequeña <$30/mes en uso normal
- [ ] Tests E2E del happy path (registrar → ver insights → cerrar día → reporte)
- [ ] Lighthouse score ≥85 en `/caja`
- [ ] Documentación API actualizada
- [ ] Variables de entorno documentadas en `.env.example`

---

## 15. Anexo: convenciones de código

### Nomenclatura

- Endpoints IA: siempre bajo `/api/ai/{verbo-en-ingles}`
- Componentes IA: prefijo `Ai` (PascalCase): `<AiInsightsWidget>`
- Funciones de prompt: archivo `prompts/{modulo}.md`, exportadas como string templates
- Tablas de IA: prefijo `ai_` (`ai_chat_sessions`, `ai_token_usage`)

### Estilo de prompts

- System prompt en español argentino (matching el tono del usuario final)
- Always include: rol del modelo, contexto del módulo, formato esperado de output, restricciones (no inventar datos, citar fuentes)
- Ejemplos few-shot cuando la tarea sea ambigua

### Output formato

- Insights y narrativas: markdown limitado (negritas, listas, sin headers)
- Datos estructurados: JSON con Zod validation en cliente y servidor
- Errores: mensaje human-readable + código técnico para Sentry

---

## 16. Decisiones tomadas (ADRs en mini)

1. **OpenAI sobre Anthropic** — el cliente provee `OPENAI_API_KEY` y prefiere ese vendor. Stack queda OpenAI-first; no se descarta Anthropic como fallback futuro.
2. **gpt-5-mini default** — balance precio/calidad. gpt-5-nano para alta frecuencia, gpt-5 full solo para reportes ejecutivos.
3. **pgvector sobre Pinecone/Weaviate** — sin dependencia externa, RLS funciona igual, costos predecibles.
4. **Redis (Upstash) sobre nada** — cache es esencial para controlar costos. Free tier suficiente al inicio.
5. **Capa IA primero, Caja después** — la inversión inicial en G se amortiza en cada módulo siguiente.
6. **Streaming en chat (SSE)** — UX mucho mejor que esperar respuesta completa, costo igual.
7. **Tools en chat con RBAC** — el asistente usa los mismos permisos que el usuario; no bypass.

---

## 17. Próximos pasos

1. Confirmar pre-requisitos de infraestructura (sección 12)
2. Generar plan detallado paso a paso vía skill `superpowers:writing-plans`
3. Ejecutar Bloque G vía skill `superpowers:subagent-driven-development`
4. Validar con commits frecuentes
5. Continuar con A → B → E → D → C → F
6. Replicar a ventas, inversiones, liquidaciones, etc.
