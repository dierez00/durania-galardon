# Changelog

Todas las fechas usan formato YYYY-MM-DD.

## [Unreleased]

### Added

- Migracion SQL v3 tenant IAM: `sql/durania_mvp_migration_v3_tenant_iam.sql`.
- Nuevas tablas tenant IAM:
  - `tenants`
  - `tenant_memberships`
  - `tenant_roles`
  - `tenant_role_permissions`
  - `tenant_user_roles`
- Tabla CRM de citas publicas: `appointment_requests`.
- Endpoints tenant IAM:
  - `GET/POST /api/tenant/iam/memberships`
  - `GET/POST/PATCH /api/tenant/iam/roles`
  - `PUT /api/tenant/iam/roles/:id/permissions`
  - `POST /api/tenant/upp-access`
  - `POST /api/tenant/mvz-assignments`
- Endpoints CRM citas:
  - `POST /api/public/appointments`
  - `GET/PATCH /api/tenant/appointments`
- Nuevas rutas por vista tenant:
  - `/producer/*`
  - `/mvz/*`
- Modulo admin tenant IAM:
  - `/admin/settings`

### Changed

- Login unificado en `/login` ahora resuelve rol por tenant y devuelve `tenantId`, `tenantSlug`, `roleKey`, `redirectTo`.
- `src/server/auth/index.ts` y `src/shared/lib/auth-client.ts` migrados a resolucion de rol por tenant.
- `src/app/api/admin/users/*` migrado a `tenant_admin` + memberships/roles tenant.
- `src/app/(tenant)/layout.tsx` ahora restringe acceso solo a `/producer/*` y `/mvz/*` por rol.
- `src/shared/ui/layout/Sidebar.tsx` ahora navega por contexto `/producer/*` o `/mvz/*`.
- `prisma/schema.prisma` actualizado a v3 tenant IAM (`tenants`, memberships, roles tenant, appointment_requests y `tenant_id` en tablas operativas).

### Removed

- Rutas tenant legacy directas (`/dashboard`, `/usuarios`, `/ranchos`, `/bovinos`, `/pruebas`, `/cuarentenas`, `/exportaciones`, `/catalogos`, `/perfil`, `/notificaciones`).

### Fixed

- Conflicto de App Router por rutas paralelas duplicadas: se consolidaron segmentos reales bajo `/producer/*` y `/mvz/*`.
- Resolucion tenant en login local: fallback robusto a `default-tenant` cuando `DEFAULT_TENANT_SLUG` no esta definido.

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
