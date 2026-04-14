Status: Canonical
Owner: Engineering
Last Updated: 2026-03-24
Source of Truth: Canonical tenant resolution and two-level workspace behavior for the current runtime.

# Multi-tenant

## Resolver de tenant

Implementado en:

- `src/server/tenants/resolveTenant.ts`

Orden de resolucion:

1. Subdominio desde `x-forwarded-host` o `host`.
2. Tenant publico fijo para hosts configurados (`PUBLIC_SITE_HOSTS`) y previews `*.vercel.app`.
3. Header `x-tenant-slug`.
4. Fallback local (`DEFAULT_TENANT_SLUG` o `default-tenant`).

Configuracion relevante:

- `DEFAULT_TENANT_SLUG`: fallback local para `localhost`.
- `PUBLIC_SITE_TENANT_SLUG`: slug fijo usado por la web publica en Vercel. Valor esperado en produccion: `gobierno-durango`.
- `PUBLIC_SITE_HOSTS`: lista opcional de hosts publicos canonicos separados por comas, por ejemplo `durania-galardon.vercel.app`.

Notas operativas:

- `NEXT_PUBLIC_SITE_URL`, si existe, aporta su host automaticamente a `PUBLIC_SITE_HOSTS`.
- Los previews `*.vercel.app` reutilizan el mismo `PUBLIC_SITE_TENANT_SLUG`; no se tratan como subdominios tenant.

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

Nota operativa:

- Si el usuario tiene rol `mvz_internal` dentro de un tenant `producer`, el tenant origen sigue siendo `producer`, pero el `panelType` activo se resuelve como `mvz` para reutilizar shell, guards y rutas MVZ.

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
- construir breadcrumb, topbar, selector inline de proyecto y sidebar por permisos

Comportamiento UI actual del workspace:

- En modo organizacion el breadcrumb muestra `Inicio`.
- En modo proyecto el breadcrumb muestra `Inicio > <proyecto actual>`.
- El cambio de proyecto/ranchos entre contextos ya no usa un selector separado bajo la topbar; usa un dropdown inline sobre el segundo item del breadcrumb.
- El sidebar tenant es compacto y no repite el contexto actual en una card lateral.
- La persistencia cliente no cambia: el proyecto activo y el ultimo modulo siguen viviendo en `sessionStorage`.
- En productor, el detalle de animal dentro de `/producer/projects/[uppId]/animales/[id]` conserva la misma logica de breadcrumb y selector inline de contexto.

## Endpoint de prueba

- `GET /api/tenant/resolve`

## Diagnostico rapido

Si `POST /api/auth/login` responde `TENANT_NOT_RESOLVED`:

1. Confirma que la app corre en `localhost` o envia `x-tenant-slug`.
2. Confirma que el tenant existe y esta activo en `tenants`.
3. Revisa `DEFAULT_TENANT_SLUG`.
4. Si la UI carga tenant pero no proyectos, revisa el scope UPP/Rancho (`resolveAccessibleUppIds()` y asignaciones activas).

Si `POST /api/public/appointments` responde `TENANT_NOT_FOUND` en Vercel:

1. Confirma `PUBLIC_SITE_TENANT_SLUG=gobierno-durango` en el entorno.
2. Confirma que `gobierno-durango` existe en `tenants` con `status = active`.
3. Verifica que el host publico este incluido en `PUBLIC_SITE_HOSTS` o que la solicitud entre por `*.vercel.app`.
