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

Cambiar las credenciales de `TEST-...` a `APP_USR-...` en `.env.production`.
Configurar webhook URL en el panel MP apuntando a:
`https://app.svi.com.ar/api/webhooks/mercadopago` (cuando se implemente —
F4.5 pendiente).

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

Migrations actuales (al 2026-04-28):
- 0001-0011: schema base + RLS + cron
- 0012: constraints ventas
- 0013: SECURITY DEFINER en triggers internos

---

*Mantener este archivo vivo durante el desarrollo: cada vez que se haga un
"shortcut" para acelerar dev, agregarlo acá con su contexto.*
