# Setup y comandos

## Requisitos

- Node.js 20+
- npm

## Instalacion

```bash
npm install
```

## Variables de entorno

Define en `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend)
- `DATABASE_URL`
- `DATABASE_URL_DIRECT`
- `DEFAULT_TENANT_SLUG` (recomendado para local)

## Requisitos de Supabase

Orden recomendado de ejecucion SQL:

1. `sql/migration_001_duraniaMVP.sql`
2. `sql/migration_002_mvz_hierarchy.sql`
3. `sql/views.sql`
4. `sql/seeds.sql`

Verificar despues de migrar:

- Trigger `on_auth_user_created` en `auth.users`.
- Tenant inicial activo (`default-tenant` o el que uses local).
- Roles de sistema por tenant.
- Publicacion `supabase_realtime` incluyendo:
  - `mvz_visits`
  - `animal_vaccinations`
  - `sanitary_incidents`
  - `upp_documents`

## Desarrollo

```bash
npm run dev
```

## Validaciones rapidas post-setup

1. `GET /api/health` responde `ok`.
2. `GET /api/tenant/resolve` devuelve `tenantSlug`.
3. Login en `/login` con `tenant_admin` redirige a `/admin`.
4. Login con MVZ redirige a `/mvz/dashboard`.

## Calidad

```bash
npm run lint
npm run typecheck
npm run test
```

## Build

```bash
npm run build
```
