# Auth y Tenant IAM

## Objetivo

- Login unico en `/login` para todos los roles.
- Resolver tenant y rol por tenant en backend.
- Aplicar permisos por modulo y scope por rancho para MVZ.

## Rutas funcionales

- Landing publica: `/`
- Login unico: `/login`
- Admin tenant: `/admin/*`
- Vistas tenant productor: `/producer/*`
- Vistas tenant MVZ:
  - `/mvz/dashboard`
  - `/mvz/ranchos/[uppId]/*`

## Modelo de roles (tenant)

Roles soportados:

- `tenant_admin`
- `producer`
- `employee`
- `mvz_government`
- `mvz_internal`

Redireccion por rol:

- `tenant_admin` -> `/admin`
- `producer` y `employee` -> `/producer/dashboard`
- `mvz_government` y `mvz_internal` -> `/mvz/dashboard`

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
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

## Reglas de autorizacion

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
