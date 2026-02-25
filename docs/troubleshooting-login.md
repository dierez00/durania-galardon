# Troubleshooting login

## Objetivo

Resolver fallas comunes al iniciar sesion en `/login`, especialmente para `tenant_admin`.

## Checklist rapido

1. La app responde en `npm run dev`.
2. `GET /api/health` responde `ok`.
3. `GET /api/tenant/resolve` devuelve `tenantSlug`.
4. El usuario existe en `auth.users`.
5. El usuario tiene membresia activa en `tenant_memberships`.
6. El usuario tiene exactamente un rol en `tenant_user_roles`.

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
- `ROLE_MULTI_ASSIGNED`
  - Causa: multiples roles tenant para la misma membresia.
  - Accion: deja un solo rol activo por usuario/tenant.

## Caso especifico: admin no redirige a panel

Para llegar a `/admin/panel`, el backend debe resolver:

- tenant valido
- membresia activa
- rol `tenant_admin`

Si alguno falla, el login no regresa `redirectTo: "/admin/panel"`.

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
where lower(p.email) = lower('admin@ejemplo.com');

-- Roles tenant asignados
select tr.key, tr.name, tm.status as membership_status
from tenant_memberships tm
join tenant_user_roles tur on tur.membership_id = tm.id
join tenant_roles tr on tr.id = tur.tenant_role_id
join profiles p on p.id = tm.user_id
where lower(p.email) = lower('admin@ejemplo.com');
```
