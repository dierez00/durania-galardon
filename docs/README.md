# Durania Docs

## Documentos

- [Arquitectura](./architecture.md)
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
- Resolucion de tenant por subdominio/header/fallback local

Las rutas funcionales del panel se encuentran en `src/app/(tenant)`.
