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
- Recovery publico: `/forgot-password`
- Activacion / nueva contrasena: `/auth/set-password`
- Admin tenant: `/admin/*`
- Vistas tenant productor: `/producer/*` (`/producer/settings` con cualquier permiso de sus tabs: `producer.tenant.*`, `producer.upp.*`, `producer.employees.*`, `producer.roles.*`)
- Vistas tenant MVZ:
  - `/mvz`
  - `/mvz/profile`
  - `/mvz/settings` (con cualquier permiso de sus tabs: `mvz.tenant.*`, `mvz.assignments.read`, `mvz.members.*`, `mvz.roles.*`; oculto para `mvz_internal`)
  - `/mvz/ranchos/[uppId]/*`

## Modelo de roles (tenant)

Roles soportados:

- `tenant_admin`
- `producer`
- `employee`
- `producer_viewer`
- `mvz_government`
- `mvz_internal`

Redireccion inicial por panel y permisos:

- `tenant_admin` -> `/admin`
- Panel `producer` -> `/producer`, `/producer/settings` o `/producer/profile` segun permisos disponibles
- Panel `mvz` -> `/mvz`, `/mvz/settings` o `/mvz/profile` segun permisos disponibles
- `mvz_internal` mantiene entrada por `/mvz`, con redirect directo a rancho si solo tiene una asignacion activa

## Flujo de login

1. Cliente envia `POST /api/auth/login` con `email`, `password`, `origin`.
2. Backend autentica en Supabase (`signInWithPassword`).
3. Backend resuelve contexto tenant y permisos.
4. Backend responde `redirectTo` segun panel y permisos efectivos.
5. Cliente persiste sesion (`supabase.auth.setSession`) y navega.

## Flujo de invitacion y recovery

1. Altas nuevas desde admin, productor y MVZ preprovisionan tenant/rol/accesos y envian invitacion por email.
2. Recovery publico usa `POST /api/auth/password/recovery`.
3. El enlace de invite o recovery aterriza en `/auth/set-password`.
4. Cliente acepta el callback de Supabase (`verifyOtp` o sesion ya redirigida), consulta `GET /api/auth/invite-context` y muestra panel/tenant/rol.
5. Cliente guarda la nueva contrasena con `supabase.auth.updateUser`.
6. La app resuelve `GET /api/auth/me` y redirige al home correcto por panel/permisos.

## Endpoints de autenticacion

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password/recovery`
- `GET /api/auth/invite-context`

## Endpoints MVZ jerarquicos

- `GET /api/mvz/dashboard`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`
- `GET|POST|PATCH /api/mvz/members`
- `GET|POST|PATCH /api/mvz/roles`
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
- `GET /api/producer/settings/ranchos`
- `GET|POST|PATCH /api/producer/roles`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`

## Reglas de autorizacion

- `GET /api/auth/me` entrega `panelType`, `permissions`, `tenant.name`, `displayName`, `roleKey`, `roleName`, `isSystemRole` e `isMvzInternal` para el shell tenant.
- `GET /api/auth/invite-context` entrega `panelType`, `tenantId`, `tenantSlug`, `tenantName`, `roleKey`, `roleName` y `assignedUpps[]` para onboarding por invitacion.
- El nombre visible self-service vive en `auth.user_metadata.full_name` y se sincroniza en topbar al editar `Mi perfil`.
- `profiles.email` funciona como espejo denormalizado de `auth.users.email` para lecturas de perfil.
- Las altas nuevas ya no retornan contrasenas temporales; las cuentas nuevas se activan por invitacion one-time y las cuentas existentes se asignan directo al tenant.
- `producer/settings` ya no expone ni edita `producers.full_name`; esa ficha se mueve a `producer/profile`.
- `mvz/settings` ya no expone ni edita `mvz_profiles.full_name` ni `license_number`; esa ficha se mueve a `mvz/profile`.
- `producer/settings` se compone por tabs (`Perfil`, `Ranchos`, `Empleados`, `Roles`) y cada tab se habilita por permisos del modulo correspondiente.
- `mvz/settings` se compone por tabs (`Perfil`, `Ranchos`, `Equipo`, `Roles`) y queda bloqueado para `mvz_internal`.
- `producer/employees` usa `roleId` y `uppAccess[]` como contrato principal para membresias y alcance por rancho.
- `mvz/members` usa `roleId` tenant-based como contrato principal, sin depender de `roleKey` fijo.
- `producer/roles` y `mvz/roles` exponen roles base protegidos y roles custom por tenant.
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
