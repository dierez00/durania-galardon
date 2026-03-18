# Docs Changelog

## [Unreleased]

### Added

- `docs/mvz-hierarchy.md`: guia funcional y tecnica del flujo MVZ jerarquico (dashboard global + panel por rancho).
- Documentacion de APIs jerarquicas en `docs/auth-admin.md` y `docs/bd/database.md`.
- Seccion de actualizacion v6 en `docs/bd/database.md` con tablas, vistas, permisos, RLS y realtime.
- `docs/archived-modules.md`: registro de modulos scaffold retirados del codigo activo y criterio para archivarlos.

### Changed

- `docs/README.md`: indice actualizado con jerarquia MVZ, referencia a modulos archivados y estado actual de la refactor estructural.
- `docs/architecture.md`: estructura real de rutas MVZ por rancho, nuevos hooks/contexto y ownership actualizado para la refactor estructural con backlog pendiente de normalizacion.
- `docs/routing.md`: rutas nuevas `/mvz/ranchos/[uppId]/*` y politica de redirects legacy.
- `docs/setup.md`: orden de migraciones actualizado (`migration_001`, `migration_002`, `views`, `seeds`).
- `docs/multitenancy.md`: separacion entre contexto tenant y contexto de rancho MVZ.
- `docs/auth-admin.md`: permisos y autorizacion por `scope.uppId`.
- `docs/tenant-iam.md`: catalogo de permisos `mvz.ranch.*`.
- `docs/prisma-from-sql.md`: nota SQL-first para tablas nuevas de MVZ jerarquico.

## [2026-02-24]

### Added

- `docs/README.md`: indice de documentacion.
- `docs/architecture.md`: estructura y reglas arquitectonicas.
- `docs/prisma-from-sql.md`: mapeo Prisma desde SQL y notas de compatibilidad.
- `docs/multitenancy.md`: flujo de resolucion de tenant y middleware.
- `docs/setup.md`: setup local y comandos operativos.
