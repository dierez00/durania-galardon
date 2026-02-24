# Multi-tenant

## Resolver de tenant

Implementado en:

- `src/server/tenants/resolveTenant.ts`

Orden de resolucion:

1. Subdominio desde `x-forwarded-host` o `host`.
2. Header `x-tenant-slug`.
3. Fallback local con `DEFAULT_TENANT_SLUG` (localhost).

## Middleware

Implementado en:

- `src/server/middleware/tenant-context.ts`
- `src/proxy.ts`

Headers inyectados:

- `x-tenant-slug-resolved`
- `x-tenant-source`

## Endpoint de prueba

- `GET /api/tenant/resolve`

Retorna `tenantSlug` y `source` cuando aplica.
