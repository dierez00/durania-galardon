Status: History
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Historical log of documentation-only changes. Current operational guidance lives in `docs/README.md` and the linked canonical docs.

# Docs Changelog

## [Unreleased]

### Added

- `docs/architecture/mvz-hierarchy.md`: guia funcional y tecnica del flujo MVZ jerarquico (dashboard global + panel por rancho).
- Documentacion de APIs jerarquicas en `docs/architecture/auth-admin.md` y `docs/data/database.md`.
- Seccion de actualizacion v6 en `docs/data/database.md` con tablas, vistas, permisos, RLS y realtime.
- `docs/architecture/archived-modules.md`: registro de modulos scaffold retirados del codigo activo y criterio para archivarlos.
- Guia de trabajo futuro en `docs/architecture/overview.md` con reglas de ownership, capas y checklist para nuevas rutas o refactors.
- Seccion de referencia rapida en `docs/README.md` para tocar estructura, APIs y validaciones del proyecto.
- Regla de trabajo y patron de reexport en `src/app/api/README.md`.

### Changed

- `docs/README.md`: indice actualizado con jerarquia MVZ, referencia a modulos archivados, cierre de la normalizacion estructural y guia rapida para futuras contribuciones.
- `docs/architecture/overview.md`: estructura real de rutas MVZ por rancho, ownership final de la refactor, estructura final de carpetas y nueva guia de trabajo por capas.
- `docs/architecture/routing.md`: rutas nuevas `/mvz/ranchos/[uppId]/*` y politica de redirects legacy.
- `docs/guides/setup.md`: orden de migraciones actualizado (`migration_001`, `migration_002`, `views`, `seeds`).
- `docs/architecture/multitenancy.md`: separacion entre contexto tenant y contexto de rancho MVZ.
- `docs/architecture/auth-admin.md`: permisos y autorizacion por `scope.uppId`.
- `docs/architecture/tenant-iam.md`: catalogo de permisos `mvz.ranch.*`.
- `docs/data/prisma-from-sql.md`: nota SQL-first para tablas nuevas de MVZ jerarquico.
- `src/app/api/README.md`: refleja el ownership final de las familias API normalizadas y el patron esperado de entrypoints delgados.
- `docs/guides/setup.md`: orden SQL actualizado para incluir `sql/migration_003_fix_rls_politicies.sql` como correccion de recursion RLS.
- `docs/security/security.md`: documenta la causa, sintoma y remediacion del error PostgreSQL `42P17` por policies recursivas sobre `public.tenants`.
- `docs/guides/troubleshooting-login.md`: agrega el caso donde productor entra correctamente pero ve `0` ranchos por fallo RLS en `resolveAccessibleUppIds()`.

## [2026-02-24]

### Added

- `docs/README.md`: indice de documentacion.
- `docs/architecture/overview.md`: estructura y reglas arquitectonicas.
- `docs/data/prisma-from-sql.md`: mapeo Prisma desde SQL y notas de compatibilidad.
- `docs/architecture/multitenancy.md`: flujo de resolucion de tenant y middleware.
- `docs/guides/setup.md`: setup local y comandos operativos.
