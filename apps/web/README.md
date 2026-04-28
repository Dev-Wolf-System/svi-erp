# apps/web — Landing + Portal Extranet

Next.js 15 (App Router) público de SVI:
- **Landing institucional** en `/` (hero, valor, catálogo preview, simulador inversor, sucursales, footer).
- **Portal extranet** en `/portal` (login + dashboards mock para cliente/inversor — datos reales llegan en F5).

## Run local

Desde la raíz del monorepo:

```bash
npm run dev    # turbo levanta web (3000) + admin (3001)
```

O solo este app:

```bash
npm --workspace=web run dev
```

Abrir `http://localhost:3000`.

## Variables de entorno

Crear `apps/web/.env.local` con al menos:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Para el resto, ver `.env.example` en la raíz del monorepo.

## Subdominios

- **Producción** (cuando se adquiera dominio): `svi.com.ar` + `svi.com.ar/portal`.
- **Provisional**: `svi.srv878399.hstgr.cloud` (deploy en VPS Hostinger con Traefik).

## Estado por fase

| Fase | Entregado |
|---|---|
| F1 | Landing premium completa (6 secciones) + portal mock + SEO/JSON-LD |
| F5 | Conectar el portal a datos reales de FCI/clientes (pendiente) |

Para detalle ver `ROADMAP_DESARROLLO.md` en la raíz.
