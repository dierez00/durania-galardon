Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Canonical tenant resolution and two-level workspace behavior for the current runtime.

# Multi-tenant

## Resolver de tenant

Implementado en:

- `src/server/tenants/resolveTenant.ts`

Orden de resolucion:

1. Subdominio desde `x-forwarded-host` o `host`.
2. Header `x-tenant-slug`.
3. Fallback local (`DEFAULT_TENANT_SLUG` o `default-tenant`).

## Middleware

Implementado en:

- `src/server/middleware/tenant-context.ts`
- `src/proxy.ts`

Headers inyectados:

- `x-tenant-slug-resolved`
- `x-tenant-source`

## Workspace de dos niveles

El runtime tenant ahora usa dos contextos de UI:

- Nivel 1: organizacion/tenant.
- Nivel 2: proyecto operativo (UPP o rancho).

La UI obtiene el contexto organizacional desde `GET /api/auth/me`, que ahora expone `tenant.id`, `tenant.slug`, `tenant.type` y `tenant.name`.

## Contexto de proyecto productor

La jerarquia de productor usa dos contextos distintos:

- Contexto tenant: resuelto por middleware (`tenantSlug`).
- Contexto proyecto: resuelto por URL (`/producer/projects/[uppId]/*`) y persistido en `sessionStorage`.

Claves de persistencia cliente:

- `producer:selectedUppId:<tenantId>`
- `workspace:lastModule:producer:<tenantId>:<uppId>`

## Contexto MVZ por rancho

La jerarquia MVZ usa dos contextos distintos:

- Contexto tenant: resuelto por middleware (`tenantSlug`).
- Contexto rancho (UPP): resuelto por URL (`/mvz/ranchos/[uppId]`) y persistido en `sessionStorage`.

Clave de persistencia cliente:

- `mvz:selectedUppId:<tenantId>`
- `workspace:lastModule:mvz:<tenantId>:<uppId>`

## Proveedor de workspace

Implementado en:

- `src/modules/workspace/presentation/TenantWorkspaceContext.tsx`
- `src/modules/workspace/presentation/navigation.ts`
- `src/modules/workspace/presentation/workspace-routing.ts`

Responsabilidades:

- cargar `auth/me` y el tenant visible para el shell
- resolver lista de proyectos accesibles (`/api/producer/upp` o `/api/mvz/assignments`)
- persistir proyecto activo y ultimo modulo visitado
- construir breadcrumb, topbar, selector de proyecto y sidebar por permisos

## Endpoint de prueba

- `GET /api/tenant/resolve`

## Diagnostico rapido

Si `POST /api/auth/login` responde `TENANT_NOT_RESOLVED`:

1. Confirma que la app corre en `localhost` o envia `x-tenant-slug`.
2. Confirma que el tenant existe y esta activo en `tenants`.
3. Revisa `DEFAULT_TENANT_SLUG`.
4. Si la UI carga tenant pero no proyectos, revisa el scope UPP/Rancho (`resolveAccessibleUppIds()` y asignaciones activas).
