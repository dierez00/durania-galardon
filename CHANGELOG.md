# Changelog

Todas las fechas usan formato YYYY-MM-DD.

## [Unreleased]

### Added

- Integracion de Supabase Auth con rutas:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- Endpoints admin para usuarios:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/:id/status`
- Landing publica en `/` con flujo hardcodeado de agendacion (servicio, fecha/hora, confirmacion) y descarga ICS.
- Nuevas rutas de autenticacion:
  - `/login` (unico)
  - `/admin/panel`
  - `/admin/users`
- Utilidades de auth y rol:
  - `src/server/auth/*`
  - `src/shared/lib/auth.ts`
  - `src/shared/lib/auth-client.ts`
  - `src/shared/lib/supabase-browser.ts`

### Changed

- `src/app/(tenant)/layout.tsx` ahora protege acceso por sesion/rol y bloquea admin en rutas tenant.
- `src/shared/ui/layout/Topbar.tsx` implementa cierre de sesion real con Supabase.
- `.env.example` actualizado con variables de Supabase y `DATABASE_URL_DIRECT`.
- `src/app/(admin)/panel/page.tsx` se mantiene como redireccion legacy a `/admin/panel`.
- Login unificado en `/login` y eliminacion de la vista `/admin/login`.

## [2026-02-24]

### Added

- Estructura modular base Hexagonal en `src/modules/*` con capas `domain/application/infra/presentation`.
- Capa server para tenant:
  - `src/server/tenants/resolveTenant.ts`
  - `src/server/middleware/tenant-context.ts`
  - `src/proxy.ts`
- API base:
  - `GET /api/health`
  - `GET /api/tenant/resolve`
- Prisma singleton en `src/server/db/prisma.ts`.
- Tests unitarios e integracion en `tests/unit` y `tests/integration`.
- Configuracion ESLint y Vitest.

### Changed

- Migracion de layout/paginas admin a route group tenant:
  - paginas bajo `src/app/(tenant)`.
- Reorganizacion de componentes compartidos a `src/shared/*`.
- Refactor de imports a aliases nuevos (`@app`, `@core`, `@modules`, `@shared`, `@server`).
- `prisma/schema.prisma` generado desde `sql/durania_mvp_migration_v2.sql`.

### Removed

- Estructura legacy en `src/components/*` y rutas directas previas que ya fueron movidas.
