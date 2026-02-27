# Changelog

Todas las fechas usan formato YYYY-MM-DD.

## [Unreleased]

### Added

- Migracion `sql/migration_002_mvz_hierarchy.sql` con:
  - `mvz_visits`
  - `animal_vaccinations`
  - `sanitary_incidents`
  - `upp_documents`
- Nuevas vistas SQL para jerarquia MVZ:
  - `v_mvz_dashboard_global`
  - `v_mvz_ranch_overview`
  - `v_mvz_ranch_reports`
- Nuevos permisos `mvz.ranch.*` y asignacion por seed para roles MVZ.
- Nuevos endpoints API:
  - `GET /api/mvz/ranchos/:uppId`
  - `GET /api/mvz/ranchos/:uppId/overview`
  - `GET /api/mvz/ranchos/:uppId/animales`
  - `GET /api/mvz/ranchos/:uppId/historial-clinico`
  - `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
  - `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
  - `GET /api/mvz/ranchos/:uppId/reportes`
  - `GET|POST /api/mvz/ranchos/:uppId/documentacion`
  - `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`
- Contexto cliente MVZ para seleccion de rancho persistida en sesion.
- Hook `useMvzRealtime` para refresh dinamico por `postgres_changes`.
- Tests de integracion para rutas MVZ de rancho (`tests/integration/mvzRanchRoutes.test.ts`).

### Changed

- `GET /api/mvz/dashboard` ahora retorna `kpisGlobales` y `ranchosAsignados`.
- Navegacion MVZ migrada a jerarquia por rancho (`/mvz/ranchos/[uppId]/*`).
- Paginas legacy MVZ (`/mvz/asignaciones`, `/mvz/pruebas`, `/mvz/exportaciones`) ahora redirigen a la nueva jerarquia.
- Layout tenant envuelve vistas con `MvzRanchProvider`.
- `src/shared/lib/auth.ts` extendido con permisos nuevos de rancho.

### Fixed

- Tipado en `src/server/db/prisma.ts` para compatibilidad con `tsc --noEmit`.

## [2026-02-24]

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
