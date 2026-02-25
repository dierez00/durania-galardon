# Tenant IAM

## Alcance

Este documento describe la capa IAM por tenant introducida en la migracion SQL v3.

## Entidades

- `tenants`: tenant operativo.
- `tenant_memberships`: pertenencia de usuario al tenant.
- `tenant_roles`: roles por tenant (sistema y personalizados).
- `tenant_role_permissions`: permisos asignados al rol tenant.
- `tenant_user_roles`: asignacion de rol a una membresia.

## Roles de sistema

- `tenant_admin`
- `producer`
- `employee`
- `mvz_government`
- `mvz_internal`

## Flujos backend

- Login (`POST /api/auth/login`): valida credenciales, resuelve tenant y rol tenant, devuelve `redirectTo`.
- Admin usuarios (`/api/admin/users*`): crea usuario auth, membresia tenant y rol tenant.
- IAM tenant (`/api/tenant/iam/*`): administra membresias/subroles/permisos.

## Politica de rutas

- `tenant_admin` -> `/admin/*`
- `producer|employee` -> `/producer/*`
- `mvz_government|mvz_internal` -> `/mvz/*`

## Invariantes de negocio

- Una membresia (`tenant_memberships`) representa a un usuario dentro de un tenant.
- El acceso operativo requiere membresia activa.
- El login exige exactamente un rol tenant por membresia activa.
- Los endpoints administrativos e IAM exigen rol `tenant_admin`.

## Tablas operativas tenant-aware

La migracion v3 agrega `tenant_id` y backfill en:

- `producers`
- `upps`
- `user_upp_access`
- `mvz_profiles`
- `mvz_upp_assignments`
- `producer_documents`
- `animals`
- `field_tests`

## Notas de seguridad

- Toda operacion tenant se valida por `tenantId` del request autenticado.
- Endpoints IAM y admin exigen `tenant_admin`.
- Persistencia de sesion basada en Supabase (token bearer + `supabase.auth.setSession` en cliente).
