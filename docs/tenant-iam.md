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
- `mvz_government`
- `mvz_internal`

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
- MVZ rancho (`/api/mvz/ranchos/:uppId/*`): requiere permisos + scope UPP.
- IAM tenant: continua administrando membresias/roles/permisos por tenant.

## Invariantes de negocio

- Una membresia activa representa acceso base al tenant.
- Los permisos se derivan de roles asignados en la membresia.
- En flujo MVZ, pertenecer al tenant MVZ no basta:
  - tambien se exige asignacion activa en `mvz_upp_assignments` para el `uppId`.

## Tablas operativas nuevas (MVZ jerarquico)

- `mvz_visits`
- `animal_vaccinations`
- `sanitary_incidents`
- `upp_documents`

## Notas de seguridad

- RLS en tablas MVZ nuevas aplica `auth_mvz_assigned_to_upp(upp_id)`.
- Vistas MVZ nuevas usan `security_invoker` para respetar RLS.
- Realtime (`postgres_changes`) hereda control de acceso via RLS.
