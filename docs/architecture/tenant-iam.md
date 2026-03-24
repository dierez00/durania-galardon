Status: Canonical
Owner: Engineering
Last Updated: 2026-03-24
Source of Truth: Canonical tenant IAM entities, permissions, and MVZ ranch-scope rules.

# Tenant IAM

## Alcance

Este documento describe la capa IAM por tenant y su extension para el flujo MVZ jerarquico por rancho.

## Entidades IAM

- `tenants`
- `tenant_memberships`
- `tenant_roles`
- `tenant_role_permissions`
- `tenant_user_roles`

## Roles de sistema

- `tenant_admin`
- `producer`
- `employee`
- `producer_viewer`
- `mvz_government`
- `mvz_internal`

## Permisos de configuracion y perfil

- `producer.tenant.read`
- `producer.tenant.write`
- `producer.profile.read`
- `producer.profile.write`
- `producer.roles.read`
- `producer.roles.write`
- `mvz.tenant.read`
- `mvz.tenant.write`
- `mvz.profile.read`
- `mvz.profile.write`

Nota operativa:

- Las claves `mvz.members.*` y `mvz.roles.*` siguen existiendo por compatibilidad, pero la gestion de personas y roles ya no se realiza dentro del panel MVZ.

## Roles base y roles custom

- Roles base reservados:
  - `government` -> `tenant_admin`
  - `producer` -> `producer`, `employee`, `mvz_internal`, `producer_viewer`
  - `mvz` -> `mvz_government`, `mvz_internal`
- Los roles base son visibles, asignables y clonables, pero sus permisos no se editan desde UI.
- Los roles custom usan `is_system = false` y una `key` interna `custom_<slug>`.
- La UI opera con un rol principal por membresia, aunque `tenant_user_roles` soporte multiples filas.
- `mvz_internal` puede existir dentro de un tenant `producer`; en ese caso el alta ocurre desde productor, pero el panel operativo sigue siendo MVZ.

## Permisos MVZ por rancho (nuevos)

- `mvz.ranch.read`
- `mvz.ranch.animals.read`
- `mvz.ranch.clinical.read`
- `mvz.ranch.vaccinations.read`
- `mvz.ranch.vaccinations.write`
- `mvz.ranch.incidents.read`
- `mvz.ranch.incidents.write`
- `mvz.ranch.reports.read`
- `mvz.ranch.documents.read`
- `mvz.ranch.documents.write`
- `mvz.ranch.visits.read`
- `mvz.ranch.visits.write`

## Flujos backend

- Login (`POST /api/auth/login`): resuelve contexto tenant + permisos.
- Profile self-service:
  - `GET|PATCH /api/producer/profile`
  - `GET|PATCH /api/mvz/profile`
- Panel settings:
  - `GET|PATCH /api/producer/settings`
  - `GET /api/producer/settings/ranchos`
  - `GET|POST|PATCH /api/producer/employees`
  - `GET|POST|PATCH /api/producer/roles`
  - `GET|PATCH /api/mvz/settings`
  - `GET|POST|PATCH|DELETE /api/mvz/roles` (compatibilidad; administracion deshabilitada)
- Equipo MVZ:
  - `GET|POST|PATCH /api/mvz/members` (compatibilidad; administracion deshabilitada)
- MVZ rancho (`/api/mvz/ranchos/:uppId/*`): requiere permisos + scope UPP.
- IAM tenant: continua administrando membresias/roles/permisos por tenant.

## Invariantes de negocio

- Una membresia activa representa acceso base al tenant.
- Los permisos se derivan de roles asignados en la membresia.
- El panel activo se resuelve por `tenant.type` + permisos + metadata del rol principal; no por un enum cerrado de roles de app.
- `Mi perfil` y `Configuracion del panel` son superficies distintas:
  - `Mi perfil` usa datos de cuenta y ficha del usuario autenticado.
  - `Configuracion del panel` usa datos operativos del tenant.
- `employee`, `producer_viewer` y `mvz_internal` mantienen acceso a `Mi perfil`, pero no a settings del panel salvo permiso explicito.
- `mvz_internal` conserva semantica especial de entrada por rancho: nunca recibe vista global de settings o metricas.
- `mvz_government` tampoco administra altas ni roles desde su panel; gobierno da de alta a `mvz_government` y cada productor da de alta a `mvz_internal`.
- Cuando un productor asigna el rol `mvz_internal`, debe existir una ficha profesional en `mvz_profiles` y una sincronizacion activa de ranchos en `mvz_upp_assignments`.
- Un tenant productor puede tener varios `mvz_internal`; la restriccion de un solo `mvz_profile` por `owner_tenant_id` fue eliminada en `sql/migration_008_allow_multiple_mvz_profiles_per_tenant.sql`.
- En flujo MVZ, pertenecer al tenant MVZ no basta:
  - tambien se exige asignacion activa en `mvz_upp_assignments` para el `uppId`.
  - `auth_mvz_assigned_to_upp()` resuelve esa asignacion por membresia activa al tenant MVZ, no solo por `user_id` del perfil profesional.

## Tablas operativas nuevas (MVZ jerarquico)

- `mvz_visits`
- `animal_vaccinations`
- `sanitary_incidents`
- `upp_documents`

## Notas de seguridad

- RLS en tablas MVZ nuevas aplica `auth_mvz_assigned_to_upp(upp_id)`.
- Vistas MVZ nuevas usan `security_invoker` para respetar RLS.
- Realtime (`postgres_changes`) hereda control de acceso via RLS.
