# Changelog

Todas las fechas usan formato YYYY-MM-DD.

## [Unreleased]

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
