# Auth y Admin Usuarios

## Objetivo

- Integrar autenticacion real con Supabase.
- Separar login publico y login admin.
- Habilitar alta y gestion basica de usuarios desde `/admin/users`.

## Rutas funcionales

- Landing publica: `/`
- Login publico: `/login`
- Login admin: `/admin/login`
- Panel admin: `/admin/panel`
- Gestion usuarios admin: `/admin/users`

## Politica de roles

- Roles validos: `admin`, `mvz`, `producer`.
- Regla estricta: cada usuario debe tener exactamente 1 rol.
- Redireccion:
  - `admin` -> `/admin/panel`
  - `mvz` y `producer` -> `/dashboard`

## Endpoints

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
    "role": "producer",
    "redirectTo": "/dashboard",
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

### GET `/api/admin/users`

- Requiere `Authorization: Bearer <access_token>`.
- Requiere rol `admin`.

### POST `/api/admin/users`

Body:

```json
{
  "email": "nuevo@dominio.com",
  "password": "temporal123",
  "fullName": "Nombre Completo",
  "role": "mvz",
  "licenseNumber": "LIC-001"
}
```

Comportamiento:

- Crea usuario en `auth.users`.
- Espera perfil autogenerado por trigger.
- Asigna rol en `user_roles`.
- Crea perfil de negocio:
  - `mvz` -> `mvz_profiles`
  - `producer` -> `producers`
  - `admin` -> solo profile + role

### PATCH `/api/admin/users/:id/status`

Body:

```json
{
  "status": "inactive"
}
```

Actualiza:

- `profiles.status`
- `producers.status` (si corresponde)
- `mvz_profiles.status` (si corresponde)

## Seguridad aplicada

- Endpoints admin validan bearer token contra Supabase.
- Solo `admin` puede listar/crear/actualizar usuarios.
- Si falla provisionamiento despues de crear `auth.users`, se elimina el usuario como compensacion.
