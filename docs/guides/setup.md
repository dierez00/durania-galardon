Status: Canonical
Owner: Engineering
Last Updated: 2026-03-29
Source of Truth: Canonical local setup, environment, and SQL execution order for the repository.

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
- `NEXT_PUBLIC_SITE_URL` (recomendado para redirects de auth; en local suele ser `http://localhost:3000`)
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend)
- `DATABASE_URL`
- `DATABASE_URL_DIRECT`
- `IOT_BACKEND_URL` (backend externo IoT App Web para snapshot, historico y stream SSE de collares)
- `DEFAULT_TENANT_SLUG` (recomendado para local)

## Requisitos de Supabase

Orden recomendado de ejecucion SQL:

1. `sql/migration_001_duraniaMVP.sql`
2. `sql/migration_002_mvz_hierarchy.sql`
3. `sql/migration_003_fix_rls_politicies.sql`
4. `sql/migration_004_settings_profile_split.sql`
5. `sql/migration_005_mvz_settings_permissions_backfill.sql`
6. `sql/migration_006_tenant_custom_roles.sql`
7. `sql/migration_007_add_iot_telemetry_tables.sql`
8. `sql/migration_008_allow_multiple_mvz_profiles_per_tenant.sql`
9. `sql/migration_009_alter_telemetry_rssi_snr_to_float8.sql`
10. `sql/migration_010_animals_backfill_and_collar_link.sql`
11. `sql/views.sql`
12. `sql/seeds.sql`

Nota:

- `sql/migration_003_fix_rls_politicies.sql` corrige recursion infinita de RLS en politicas que referencian `public.tenants`, especialmente visible cuando paneles de productor/MVZ cargan vacios aunque la sesion y el tenant se resuelven correctamente.
- `sql/migration_008_allow_multiple_mvz_profiles_per_tenant.sql` debe ejecutarse para permitir varios `mvz_internal` dentro del mismo tenant productor.

Verificar despues de migrar:

- Trigger `on_auth_user_created` en `auth.users`.
- Tenant inicial activo (`default-tenant` o el que uses local).
- Roles de sistema por tenant.
- `SITE_URL` de Supabase apuntando a la URL canónica del entorno.
- Redirect URLs incluyendo `http://localhost:3000/**` para desarrollo.
- Templates de email `invite` y `recovery` apuntando a `/auth/set-password` o, en su defecto, redirects compatibles con esa ruta.
- Publicacion `supabase_realtime` incluyendo:
  - `mvz_visits`
  - `animal_vaccinations`
  - `sanitary_incidents`
  - `upp_documents`

## Auth redirects de Supabase

- Para produccion, configura `NEXT_PUBLIC_SITE_URL` con la URL publica real de la app.
- Para desarrollo, agrega `http://localhost:3000/**` en Redirect URLs de Supabase Auth.
- El flujo nuevo usa:
  - `/forgot-password` para solicitar recovery.
  - `/auth/set-password` para aceptar invitaciones y definir nueva contrasena.
- Si personalizas templates de Supabase, apunta los enlaces de invitacion/recovery a esa ruta con `token_hash` y `type`.

## Desarrollo

```bash
npm run dev
```

## Validaciones rapidas post-setup

1. `GET /api/health` responde `ok`.
2. `GET /api/tenant/resolve` devuelve `tenantSlug`.
3. Login en `/login` con `tenant_admin` redirige a `/admin`.
4. Login con MVZ redirige a `/mvz`.

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
