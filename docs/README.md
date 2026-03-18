# Durania Docs

## Lectura recomendada

1. [Arquitectura](./architecture.md)
2. [Setup y comandos](./setup.md)
3. [Multi-tenant](./multitenancy.md)
4. [Auth y Tenant IAM](./auth-admin.md)
5. [Rutas y guards](./routing.md)
6. [MVZ jerarquico](./mvz-hierarchy.md)

Si vas a tocar estructura o APIs, lee tambien [src/app/api/README.md](../src/app/api/README.md).

## Indice de documentos

- [Arquitectura](./architecture.md)
- [Modulos archivados](./archived-modules.md)
- [Auth y Tenant IAM](./auth-admin.md)
- [Tenant IAM](./tenant-iam.md)
- [Rutas y guards](./routing.md)
- [MVZ jerarquico](./mvz-hierarchy.md)
- [Troubleshooting login](./troubleshooting-login.md)
- [Prisma y SQL](./prisma-from-sql.md)
- [Multi-tenant](./multitenancy.md)
- [Setup y comandos](./setup.md)
- [Base de datos](./bd/database.md)
- [Contexto de producto](./product/CONTEXT.md)
- [Changelog de documentacion](./CHANGELOG.md)

## Resumen rapido

- Stack: Next.js App Router + Supabase Auth + Supabase PostgreSQL.
- Tenant IAM: `tenant_memberships`, `tenant_roles`, `tenant_user_roles`.
- Resolucion de tenant: subdominio -> `x-tenant-slug` -> fallback local.
- Login unico: `/login`.
- Jerarquia MVZ: dashboard global + panel contextual por rancho (`UPP`).
- Refactor estructural completada en las rutas objetivo: `src/app` y `src/app/api` quedan como entrypoints delgados; `src/modules` es el owner de negocio.

## Que quedo hecho

- La logica de negocio pendiente salio de las familias API documentadas en la refactor:
  - `admin/producers`
  - `admin/mvz`
  - `producer/bovinos`
  - `producer/documents`
  - `producer/upp`
  - `producer/upp-documents`
  - `admin/appointments`
  - `public/appointments`
  - `admin/audit`
  - `mvz/assignments`
- Los handlers HTTP viven ahora en `infra/http` dentro del modulo dueno.
- Las implementaciones server-side de repositorios viven en `infra/supabase` cuando dependen de Supabase.
- `src/server/auth/provisioning` concentra helpers transversales de Auth/GoTrue.
- Se eliminaron residuos locales archivados y archivos UI duplicados `* copy.tsx`.

## Referencia rapida para trabajar

- `src/app` y `src/app/api` no deben volver a acumular logica de negocio.
- Antes de crear archivos nuevos, decide primero el owner: `src/modules/admin`, `src/modules/producer`, `src/modules/mvz` o `src/modules/<capability>`.
- Usa `src/server` solo para concerns transversales de backend.
- Si cambias ownership o agregas una nueva familia de rutas, actualiza `docs/architecture.md`, [src/app/api/README.md](../src/app/api/README.md) y `docs/CHANGELOG.md` en el mismo cambio.
- Valida con `npm run typecheck`, `npm run lint` y `npm run test:integration`.

Rutas principales:

- `/` landing publica con wizard de citas.
- `/login` login unico para todos los perfiles.
- `/admin/*` para `tenant_admin`.
- `/producer/*` para `producer` y `employee`.
- `/mvz/dashboard` dashboard global MVZ.
- `/mvz/ranchos/[uppId]/*` panel jerarquico MVZ por rancho.
