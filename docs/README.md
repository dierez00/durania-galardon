# Durania Docs

## Documentos

- [Arquitectura](./architecture.md)
- [Auth y Admin Usuarios](./auth-admin.md)
- [Prisma y SQL](./prisma-from-sql.md)
- [Multi-tenant](./multitenancy.md)
- [Setup y comandos](./setup.md)
- [Changelog de documentacion](./CHANGELOG.md)

## Resumen rapido

Este proyecto usa:

- Next.js App Router
- Arquitectura modular estilo Hexagonal (domain/application/infra/presentation)
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth (login unico con redireccion por rol)
- Resolucion de tenant por subdominio/header/fallback local

Rutas principales:

- `/` landing publica con flujo de citas hardcodeado
- `/login` login unico
- `/admin/users` gestion y alta de usuarios
- `/dashboard` y modulos tenant para roles no-admin
