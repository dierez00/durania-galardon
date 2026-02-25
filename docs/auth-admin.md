# Auth y Tenant IAM

## Objetivo

- Login unico en `/login` para todos los roles.
- Resolver tenant y rol por tenant en backend.
- Gestionar usuarios y permisos del tenant desde admin.

## Rutas funcionales

- Landing publica: `/`
- Login unico: `/login`
- `/admin/login` retirado (ruta inexistente/404)
- Admin tenant: `/admin/panel`, `/admin/users`, `/admin/settings`
- Vistas tenant productor: `/producer/*`
- Vistas tenant MVZ: `/mvz/*`

## Modelo de roles (tenant)

Roles soportados:

- `tenant_admin`
- `producer`
- `employee`
- `mvz_government`
- `mvz_internal`

Regla aplicada en auth: un usuario debe tener exactamente un rol asignado dentro de su membresia tenant activa.

Redireccion por rol:

- `tenant_admin` -> `/admin/panel`
- `producer` y `employee` -> `/producer/dashboard`
- `mvz_government` y `mvz_internal` -> `/mvz/dashboard`

## Flujo de login

1. Cliente envia `POST /api/auth/login` con `email`, `password`, `origin`.
2. Backend autentica en Supabase (`signInWithPassword`).
3. Backend resuelve tenant (`x-tenant-slug-resolved` o resolver directo).
4. Backend busca membresia activa en `tenant_memberships`.
5. Backend resuelve un solo rol en `tenant_user_roles` + `tenant_roles`.
6. Backend responde `redirectTo` segun rol.
7. Cliente persiste sesion con `supabase.auth.setSession`.
8. Cliente navega a la ruta final (`/admin/panel`, `/producer/dashboard`, `/mvz/dashboard`).

## Endpoints de autenticacion

### POST `/api/auth/login`

Request:

```json
{
  "email": "usuario@dominio.com",
  "password": "secreto",
  "origin": "public"
}
```

Response (ok):

```json
{
  "ok": true,
  "data": {
    "roleKey": "producer",
    "tenantId": "uuid",
    "tenantSlug": "default-tenant",
    "redirectTo": "/producer/dashboard",
    "session": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresAt": 12345,
      "tokenType": "bearer"
    }
  }
}
```

### POST `/api/auth/logout`

Response:

```json
{
  "ok": true,
  "data": {
    "status": "signed_out"
  }
}
```

## Endpoints de admin usuarios

Todos requieren `Authorization: Bearer <access_token>` y rol `tenant_admin`.

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/status`

`POST /api/admin/users` crea usuario real en Supabase Auth + membership tenant + rol tenant.

Alta por rol:

- `producer` -> crea `producers`
- `mvz_government` o `mvz_internal` -> crea `mvz_profiles` (requiere `licenseNumber`)
- `tenant_admin` y `employee` -> sin perfil de negocio adicional

## Endpoints IAM tenant

- `GET/POST /api/tenant/iam/memberships`
- `GET/POST/PATCH /api/tenant/iam/roles`
- `PUT /api/tenant/iam/roles/:id/permissions`
- `POST /api/tenant/upp-access`
- `POST /api/tenant/mvz-assignments`

## Landing CRM de citas

- `POST /api/public/appointments`
- `GET/PATCH /api/tenant/appointments` (solo `tenant_admin`)

La landing registra solicitudes CRM (`appointment_requests`) y no crea usuarios automaticamente.

## Errores comunes de login

- `TENANT_NOT_RESOLVED`: no se pudo determinar tenant en la solicitud.
  - Verifica `DEFAULT_TENANT_SLUG` en local o subdominio/header en ambientes remotos.
- `TENANT_NOT_FOUND`: el slug existe en request pero no hay tenant activo en tabla `tenants`.
- `ROLE_NOT_FOUND`: usuario sin membresia activa o sin rol tenant asignado.
- `ROLE_MULTI_ASSIGNED`: el usuario tiene mas de un rol tenant activo en la misma membresia.

Ver guia operativa: [Troubleshooting login](./troubleshooting-login.md).
