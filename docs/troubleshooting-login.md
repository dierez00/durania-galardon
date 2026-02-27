# Troubleshooting login

## Objetivo

Resolver fallas comunes al iniciar sesion en `/login`, especialmente para `tenant_admin` y usuarios MVZ.

## Checklist rapido

1. La app responde en `npm run dev`.
2. `GET /api/health` responde `ok`.
3. `GET /api/tenant/resolve` devuelve `tenantSlug`.
4. El usuario existe en `auth.users`.
5. El usuario tiene membresia activa en `tenant_memberships`.
6. El usuario tiene al menos un rol valido en `tenant_user_roles`.

## Errores frecuentes y causa

- `TENANT_NOT_RESOLVED`
  - Causa: no se pudo derivar slug de tenant.
  - Accion: define `DEFAULT_TENANT_SLUG` o usa `x-tenant-slug`/subdominio.
- `TENANT_NOT_FOUND`
  - Causa: tenant inexistente o inactivo.
  - Accion: valida registro en tabla `tenants` con `status = active`.
- `ROLE_NOT_FOUND`
  - Causa: sin membresia activa o sin rol tenant.
  - Accion: revisa `tenant_memberships` y `tenant_user_roles`.
- `FORBIDDEN`
  - Causa: ruta protegida sin permisos suficientes o sin scope UPP.
  - Accion: valida permisos y asignaciones MVZ por rancho.

## Caso especifico: admin no redirige

Para llegar a `/admin`, el backend debe resolver:

- tenant valido
- membresia activa
- rol `tenant_admin`

Si alguno falla, el login no regresa `redirectTo: "/admin"`.

## Caso especifico: MVZ no entra a rancho

Si el login funciona pero falla `/mvz/ranchos/[uppId]/*`:

1. Verifica que exista perfil activo en `mvz_profiles`.
2. Verifica asignacion activa en `mvz_upp_assignments` para ese `uppId`.
3. Verifica permisos `mvz.ranch.*` para el rol MVZ.

## SQL de verificacion (referencia)

```sql
-- Tenant activo esperado
select id, slug, status
from tenants
where slug = 'default-tenant';

-- Membresia activa del usuario
select tm.id, tm.status, tm.tenant_id, tm.user_id
from tenant_memberships tm
join profiles p on p.id = tm.user_id
where p.id = '<user_uuid>';

-- Roles tenant asignados
select tr.key, tr.name, tm.status as membership_status
from tenant_memberships tm
join tenant_user_roles tur on tur.membership_id = tm.id
join tenant_roles tr on tr.id = tur.tenant_role_id
where tm.user_id = '<user_uuid>';

-- Asignaciones MVZ activas a UPP
select mua.id, mua.upp_id, mua.status
from mvz_upp_assignments mua
join mvz_profiles mp on mp.id = mua.mvz_profile_id
where mp.user_id = '<user_uuid>'
  and mua.status = 'active';
```
