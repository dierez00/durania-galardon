# Durania Docs

## Lectura recomendada

1. [Setup y comandos](./setup.md)
2. [Multi-tenant](./multitenancy.md)
3. [Auth y Tenant IAM](./auth-admin.md)
4. [Rutas y guards](./routing.md)
5. [MVZ jerarquico](./mvz-hierarchy.md)

## Indice de documentos

- [Arquitectura](./architecture.md)
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

Rutas principales:

- `/` landing publica con wizard de citas.
- `/login` login unico para todos los perfiles.
- `/admin/*` para `tenant_admin`.
- `/producer/*` para `producer` y `employee`.
- `/mvz/dashboard` dashboard global MVZ.
- `/mvz/ranchos/[uppId]/*` panel jerarquico MVZ por rancho.
