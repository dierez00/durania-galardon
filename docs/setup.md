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
- `DEFAULT_TENANT_SLUG` (opcional para local)

Puedes usar `.env.example` como base.

## Requisitos de Supabase

- Ejecutar la migracion SQL `sql/durania_mvp_migration_v2.sql` en Supabase.
- Verificar que existan:
  - trigger `on_auth_user_created` sobre `auth.users`
  - roles seed: `admin`, `mvz`, `producer`

## Desarrollo

```bash
npm run dev
```

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
