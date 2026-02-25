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
- `DEFAULT_TENANT_SLUG` (recomendado para local; fallback por defecto: `default-tenant`)

Puedes usar `.env.example` como base.

## Requisitos de Supabase

1. Ejecutar migracion base `sql/durania_mvp_migration_v2.sql`.
2. Ejecutar migracion tenant IAM `sql/durania_mvp_migration_v3_tenant_iam.sql`.
3. Ejecutar migracion RBAC modulos `sql/durania_mvp_migration_v4_rbac_modules.sql` (si aplica en tu entorno).
4. Verificar:
   - trigger `on_auth_user_created` sobre `auth.users`
   - tenant inicial `default-tenant`
   - roles tenant de sistema:
     - `tenant_admin`
     - `producer`
     - `employee`
     - `mvz_government`
     - `mvz_internal`

## Desarrollo

```bash
npm run dev
```

## Validaciones rapidas post-setup

1. `GET /api/health` debe responder `ok`.
2. `GET /api/tenant/resolve` debe devolver `tenantSlug` en local.
3. Login en `/login` con un usuario `tenant_admin` debe redirigir a `/admin/panel`.

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
