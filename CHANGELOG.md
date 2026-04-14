# Changelog

Todas las fechas usan formato YYYY-MM-DD.

## [Unreleased]

### Added

- Migracion `sql/migration_010_animals_backfill_and_collar_link.sql` para ampliar `animals`, promover backfill desde staging y vincular collares de forma canonica e idempotente.
- Migracion `sql/migration_008_allow_multiple_mvz_profiles_per_tenant.sql` para permitir varios `mvz_internal` dentro del mismo tenant productor.
- Flujo publico de recovery e invitacion con:
  - `POST /api/auth/password/recovery`
  - `GET /api/auth/invite-context`
  - `/forgot-password`
  - `/auth/set-password`
- Nuevo endpoint `POST /api/producer/employees/resend-invite` para reenviar onboarding pendiente desde la tabla de empleados.
- Migracion `sql/migration_006_tenant_custom_roles.sql` para permisos `producer.roles.*` y `mvz.roles.*` con backfill a roles base.
- Nuevos endpoints API para roles editables por tenant:
  - `GET|POST|PATCH|DELETE /api/producer/roles`
  - `GET|POST|PATCH|DELETE /api/mvz/roles`
- Nuevo endpoint agregado `GET /api/producer/settings/ranchos` para resumen de UPPs y matriz de asignaciones por empleado.
- Rutas y endpoints self-service por panel:
  - `GET|PATCH /api/producer/profile`
  - `GET|PATCH /api/mvz/profile`
  - `/producer/profile`
  - `/mvz/profile`
- API de equipo MVZ:
  - `GET|POST|PATCH /api/mvz/members`
- Migracion `sql/migration_005_mvz_settings_permissions_backfill.sql` para completar permisos de configuracion MVZ en tenants existentes.
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

- `v_animals_sanitary`, `prisma/schema.prisma` y la UI de animales ahora exponen perfil ampliado del animal (`name`, `breed`, `weight_kg`, `age_years`, `health_status`, `last_vaccine_at`) y snapshot del collar activo.
- Las tablas de animales en productor y MVZ ocultan la columna `Rancho` cuando la vista ya esta contextualizada por proyecto o rancho, y el nombre del animal ahora abre la misma ficha que el boton de acciones.
- La ficha detalle de animales agrega acciones rapidas por panel; en MVZ abre vacunacion e incidencias con `animalId` precargado y en productor enlaza a exportaciones, movilizaciones y documentos del proyecto.
- `GET|POST|PATCH /api/producer/employees` ahora soporta altas y ediciones de `mvz_internal` con `fullName`, `licenseNumber`, creacion de `mvz_profiles` y sincronizacion de ranchos a `mvz_upp_assignments`.
- `mvz_internal` dentro de un tenant productor ahora entra al panel MVZ (`/mvz`) y reutiliza el shell MVZ con sus ranchos asignados.
- `producer/settings -> Equipo` agrega edicion de rol, ranchos asignados y estado en tabla, y pide nombre profesional + cédula/licencia cuando el rol es `mvz_internal`.
- `mvz/settings` deja de administrar equipo y roles; las altas de `mvz_government` quedan a cargo de gobierno y las de `mvz_internal` a cargo del productor.
- `GET|POST|PATCH /api/mvz/members` y `GET|POST|PATCH|DELETE /api/mvz/roles` se conservan por compatibilidad, pero ahora responden `403 FORBIDDEN`.
- El panel MVZ por rancho concentra sus KPI contextuales solo en `Resumen`, agrega acciones rápidas (`Registrar incidencia`, `Registrar vacunación`, `Programar visita`) y corrige el color de estados en `Incidencias`.
- Se normaliza copy visible en admin, productor y MVZ hacia español claro y no técnico.
- Altas nuevas de productores, MVZ, empleados y miembros MVZ ya no retornan contrasenas temporales; ahora invitan cuentas nuevas por email y reasignan cuentas existentes al tenant.
- `producer/settings` ahora se renderiza por tabs (`Perfil`, `Ranchos`, `Equipo`, `Roles`) y `mvz/settings` queda acotado a (`Perfil`, `Ranchos`), dejando de depender de una sola carga monolitica.
- La resolucion de panel tenant ya no depende de un `AppRole` fijo; ahora usa `tenant.type`, permisos y metadata del rol principal.
- `GET /api/auth/me` y el shell tenant ahora exponen/consumen `roleKey`, `roleName`, `isSystemRole` e `isMvzInternal`.
- `GET|POST|PATCH /api/producer/employees` ahora usa `roleId` y `uppAccess[]` como contrato principal para rol y alcance por rancho.
- `producer/settings -> Equipo` simplifica el alta a `rol dentro del panel` + `ranchos asignados`, fija el acceso inicial operativo por rancho y muestra un estado derivado de onboarding (`Invitacion enviada`, `Pendiente`, `Activo`, `Dado de baja`).
- `producer/settings -> Roles` permite editar y eliminar roles base visibles y roles custom; la eliminacion se bloquea si el rol sigue asignado a miembros.
- `mvz_internal` ya no accede a settings ni metricas globales; `/mvz` redirige directo al rancho si solo tiene una asignacion activa y muestra lista minima si tiene varias.
- `ProfileMenu` separa `Mi perfil` de `Configuracion del panel` y oculta esta ultima opcion cuando el usuario no tiene permisos de tenant settings.
- `GET|PATCH /api/producer/settings` ahora administra solo configuracion del tenant productor, resumen operativo y bloques documentales/equipo.
- `GET|PATCH /api/mvz/settings` ahora administra solo configuracion del tenant MVZ y ranchos asignados.
- Las fichas personales de productor y MVZ se movieron a endpoints/paginas de perfil; `email`, `CURP` y `license_number` quedan en solo lectura para self-service.
- `src/shared/lib/auth.ts` incorpora `producer_viewer`, permisos `producer.tenant.*`, `mvz.tenant.*`, `mvz.profile.*` y `mvz.members.*`.
- Los guards tenant dejaron de depender de permisos legacy para abrir settings y ahora distinguen perfil self-service vs configuracion del panel.
- `GET /api/mvz/dashboard` ahora retorna `kpisGlobales` y `ranchosAsignados`.
- Navegacion MVZ migrada a jerarquia por rancho (`/mvz/ranchos/[uppId]/*`).
- Paginas legacy MVZ (`/mvz/asignaciones`, `/mvz/pruebas`, `/mvz/exportaciones`) ahora redirigen a la nueva jerarquia.
- Layout tenant envuelve vistas con `MvzRanchProvider`.
- `src/shared/lib/auth.ts` extendido con permisos nuevos de rancho.
- Shell tenant de `producer` y `mvz` simplificado: sidebar compacto sin card contextual, breadcrumb `Inicio > proyecto actual` y selector inline de rancho/UPP en topbar.
- Dashboard global MVZ ya no renderiza una card separada para seleccionar rancho; el cambio de contexto vive en la topbar del panel por rancho.

### Fixed

- `admin/exports` en panel gobierno ya no falla con `404` al abrir, editar o eliminar exportaciones de tenants `producer`; el backend ahora resuelve y muta cada solicitud usando el `tenant_id` real del registro.
- `POST /api/admin/exports` ahora crea solicitudes en el tenant productor duenio de la `UPP`, en lugar de asociarlas incorrectamente al tenant gobierno.
- Se remedia el arbol de dependencias afectado por advisories: `xlsx` se sustituye por `exceljs`, se retira `shadcn` como dependencia npm, se actualizan `next`, `eslint-config-next`, `prisma` y `@prisma/client`, y `npm audit` queda en `0 vulnerabilities`.
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
