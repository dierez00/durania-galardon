# Multi-tenant

## Resolver de tenant

Implementado en:

- `src/server/tenants/resolveTenant.ts`

Orden de resolucion:

1. Subdominio desde `x-forwarded-host` o `host`.
2. Header `x-tenant-slug`.
3. Fallback local (solo localhost):
   - `DEFAULT_TENANT_SLUG` si existe.
   - `default-tenant` por defecto si no existe variable.

Reglas practicas:

- En `localhost` no necesitas subdominio para resolver tenant.
- En entornos remotos se recomienda usar subdominio o header explicito.

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

## Diagnostico rapido

Si `POST /api/auth/login` responde `TENANT_NOT_RESOLVED`:

1. Confirma que la app corre sobre `localhost` o envia `x-tenant-slug`.
2. Confirma que el tenant existe y esta activo en tabla `tenants`.
3. Revisa `DEFAULT_TENANT_SLUG` cuando trabajes en local con tenant distinto a `default-tenant`.
