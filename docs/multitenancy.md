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

## Contexto MVZ por rancho (no tenant)

La jerarquia MVZ usa dos contextos distintos:

- Contexto tenant: resuelto por middleware (`tenantSlug`).
- Contexto rancho (UPP): resuelto por URL (`/mvz/ranchos/[uppId]`) y persistido en `sessionStorage`.

Clave de persistencia cliente:

- `mvz:selectedUppId:<tenantId>`

## Endpoint de prueba

- `GET /api/tenant/resolve`

## Diagnostico rapido

Si `POST /api/auth/login` responde `TENANT_NOT_RESOLVED`:

1. Confirma que la app corre en `localhost` o envia `x-tenant-slug`.
2. Confirma que el tenant existe y esta activo en `tenants`.
3. Revisa `DEFAULT_TENANT_SLUG`.
