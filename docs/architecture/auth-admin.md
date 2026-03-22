Status: Canonical
Owner: Engineering
Last Updated: 2026-03-22
Source of Truth: Canonical auth flow, role routing, and tenant-level authorization model.

# Auth y Tenant IAM

## Objetivo

- Login unico en `/login` para todos los roles.
- Resolver tenant y rol por tenant en backend.
- Aplicar permisos por modulo y scope por rancho para MVZ.

## Rutas funcionales

- Landing publica: `/`
- Login unico: `/login`
- Admin tenant: `/admin/*`
- Vistas tenant productor: `/producer/*` (`/producer/settings` solo con `producer.tenant.read`)
- Vistas tenant MVZ:
  - `/mvz`
  - `/mvz/profile`
  - `/mvz/settings` (solo con `mvz.tenant.read`)
  - `/mvz/ranchos/[uppId]/*`

## Modelo de roles (tenant)

Roles soportados:

- `tenant_admin`
- `producer`
- `employee`
- `producer_viewer`
- `mvz_government`
- `mvz_internal`

Redireccion por rol:

- `tenant_admin` -> `/admin`
- `producer`, `employee` y `producer_viewer` -> `/producer`
- `mvz_government` y `mvz_internal` -> `/mvz`

## Flujo de login

1. Cliente envia `POST /api/auth/login` con `email`, `password`, `origin`.
2. Backend autentica en Supabase (`signInWithPassword`).
3. Backend resuelve contexto tenant y permisos.
4. Backend responde `redirectTo` segun panel.
5. Cliente persiste sesion (`supabase.auth.setSession`) y navega.

## Endpoints de autenticacion

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Endpoints MVZ jerarquicos

- `GET /api/mvz/dashboard`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`
- `GET|POST|PATCH /api/mvz/members`
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

## Endpoints self-service por panel

- `GET|PATCH /api/producer/profile`
- `GET|PATCH /api/producer/settings`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`

## Reglas de autorizacion

- `GET /api/auth/me` entrega `panelType`, `permissions`, `tenant.name` y `displayName` para el shell tenant.
- El nombre visible self-service vive en `auth.user_metadata.full_name` y se sincroniza en topbar al editar `Mi perfil`.
- `profiles.email` funciona como espejo denormalizado de `auth.users.email` para lecturas de perfil.
- `producer/settings` ya no expone ni edita `producers.full_name`; esa ficha se mueve a `producer/profile`.
- `mvz/settings` ya no expone ni edita `mvz_profiles.full_name` ni `license_number`; esa ficha se mueve a `mvz/profile`.
- `producer/settings` usa `producer.tenant.read/write`.
- `mvz/settings` usa `mvz.tenant.read/write`.
- `mvz/members` usa `mvz.members.read/write` y queda limitado a `mvz_government`.
- Todos los endpoints MVZ de rancho validan:
  - rol MVZ
  - permisos del modulo
  - `scope.uppId` (rancho asignado)
- Un MVZ no puede consultar ni mutar ranchos no asignados.

## Errores comunes

- `TENANT_NOT_RESOLVED`: no se pudo resolver tenant.
- `ROLE_NOT_FOUND`: usuario sin membresia/rol valido.
- `FORBIDDEN`: sin permiso o sin acceso al `uppId` solicitado.
- `MVZ_PROFILE_NOT_FOUND`: usuario MVZ sin perfil activo.
