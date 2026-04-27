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

### Opción B — desde el VPS (CLI Supabase self-hosted)

Si el panel de Hooks no está disponible en tu versión, editar el `.env` del Supabase docker-compose y agregar:

```env
GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED=true
GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI=pg-functions://postgres/public/custom_access_token_hook
```

Luego reiniciar el contenedor `auth`:

```bash
docker compose restart auth
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

En **Authentication → URL Configuration**:

```
Site URL: http://localhost:3001       (dev: admin)
Redirect URLs:
  http://localhost:3000/**            (web local)
  http://localhost:3001/**            (admin local)
  https://app.svi.com.ar/**           (admin prod — agregar cuando exista)
  https://svi.com.ar/portal/**        (portal prod)
```

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

## 8. Próximos pasos

- ✅ Schema aplicado
- ✅ Hook JWT activo
- ✅ Usuario admin creado
- ⏳ Conectar el dashboard admin con datos reales (Drizzle queries) — Fase 3
- ⏳ Configurar Storage buckets para fotos
- ⏳ Mover N8N webhooks a Edge Functions (Fase 9)
