Status: Canonical
Owner: Engineering
Last Updated: 2026-03-24
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
  - `/mvz/settings` (solo `Perfil` y `Ranchos`; visible para `mvz_government` con `mvz.tenant.*` o `mvz.assignments.read`, oculto para `mvz_internal`)
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
- `mvz_internal` puede pertenecer a un tenant `producer`; en ese caso se da de alta desde productor, pero su shell operativo sigue siendo `/mvz`

## Flujo de login

1. Cliente envia `POST /api/auth/login` con `email`, `password`, `origin`.
2. Backend autentica en Supabase (`signInWithPassword`).
3. Backend resuelve contexto tenant y permisos.
4. Backend responde `redirectTo` segun panel y permisos efectivos.
5. Cliente persiste sesion (`supabase.auth.setSession`) y navega.

## Flujo de invitacion y recovery

1. Altas nuevas desde admin y productor preprovisionan tenant/rol/accesos y envian invitacion por email.
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
- `GET|POST|PATCH /api/mvz/members` (compatibilidad; administracion deshabilitada en panel)
- `GET|POST|PATCH|DELETE /api/mvz/roles` (compatibilidad; administracion deshabilitada en panel)
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
- `GET|POST|PATCH /api/producer/employees`
- `GET|PATCH /api/producer/settings`
- `GET /api/producer/settings/ranchos`
- `GET|POST|PATCH|DELETE /api/producer/roles`
- `POST /api/producer/employees/resend-invite`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`
- `GET|POST|PATCH /api/mvz/members` (compatibilidad; retorna `403`)
- `GET|POST|PATCH|DELETE /api/mvz/roles` (compatibilidad; retorna `403`)

## Reglas de autorizacion

- `GET /api/auth/me` entrega `panelType`, `permissions`, `tenant.name`, `displayName`, `roleKey`, `roleName`, `isSystemRole` e `isMvzInternal` para el shell tenant.
- `GET /api/auth/invite-context` entrega `panelType`, `tenantId`, `tenantSlug`, `tenantName`, `roleKey`, `roleName` y `assignedUpps[]` para onboarding por invitacion.
- El nombre visible self-service vive en `auth.user_metadata.full_name` y se sincroniza en topbar al editar `Mi perfil`.
- `profiles.email` funciona como espejo denormalizado de `auth.users.email` para lecturas de perfil.
- Las altas nuevas ya no retornan contrasenas temporales; las cuentas nuevas se activan por invitacion one-time y las cuentas existentes se asignan directo al tenant.
- `producer/settings` ya no expone ni edita `producers.full_name`; esa ficha se mueve a `producer/profile`.
- `mvz/settings` ya no expone ni edita `mvz_profiles.full_name` ni `license_number`; esa ficha se mueve a `mvz/profile`.
- `producer/settings` se compone por tabs (`Perfil`, `Ranchos`, `Equipo`, `Roles`) y cada tab se habilita por permisos del modulo correspondiente.
- `mvz/settings` se compone por tabs (`Perfil`, `Ranchos`) y muestra una nota operativa para gestion de personal.
- La administracion de personal MVZ ya no ocurre dentro del panel MVZ:
  - gobierno da de alta a `mvz_government`
  - cada productor da de alta a `mvz_internal`
- `producer/employees` usa `roleId` y `uppAccess[]` como contrato principal para membresias y alcance por rancho.
- Cuando `producer/employees` asigna el rol `mvz_internal`, tambien exige `fullName` y `licenseNumber`, crea o actualiza `mvz_profiles` y sincroniza `mvz_upp_assignments` con los ranchos asignados.
- La UI de `producer/settings -> Equipo` simplifica el alta a `rol dentro del panel` + `ranchos asignados`; para `mvz_internal` agrega nombre profesional y cédula/licencia.
- La tabla de `producer/employees` deriva un estado de acceso visible (`Invitacion enviada`, `Pendiente`, `Activo`, `Dado de baja`) a partir de `tenant_memberships`, `profiles.status` y señales de lifecycle en Supabase Auth.
- `POST /api/producer/employees/resend-invite` solo se habilita para empleados con onboarding pendiente y reenvia invitacion o recovery hacia `/auth/set-password`.
- `GET|POST|PATCH /api/mvz/members` y `GET|POST|PATCH|DELETE /api/mvz/roles` responden `403 FORBIDDEN` para reflejar que ese flujo se gestiona fuera del panel MVZ.
- `producer/roles` expone roles base visibles y roles custom por tenant.
- La eliminacion de roles tenant en productor se bloquea cuando el rol aun tiene membresias asignadas; primero debe desasignarse de `tenant_user_roles`.
- Todos los endpoints MVZ de rancho validan:
  - rol MVZ
  - permisos del modulo
  - `scope.uppId` (rancho asignado)
- Un MVZ no puede consultar ni mutar ranchos no asignados.
- `mvz_internal` no puede usar dashboard global ni metricas globales; su experiencia queda acotada a ranchos asignados.

## Errores comunes

- `TENANT_NOT_RESOLVED`: no se pudo resolver tenant.
- `ROLE_NOT_FOUND`: usuario sin membresia/rol valido.
- `FORBIDDEN`: sin permiso o sin acceso al `uppId` solicitado.
- `MVZ_PROFILE_NOT_FOUND`: usuario MVZ sin perfil activo.
