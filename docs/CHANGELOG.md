# Docs Changelog

## [Unreleased]

### Added

- `docs/mvz-hierarchy.md`: guia funcional y tecnica del flujo MVZ jerarquico (dashboard global + panel por rancho).
- Documentacion de APIs jerarquicas en `docs/auth-admin.md` y `docs/bd/database.md`.
- Seccion de actualizacion v6 en `docs/bd/database.md` con tablas, vistas, permisos, RLS y realtime.
- `docs/archived-modules.md`: registro de modulos scaffold retirados del codigo activo y criterio para archivarlos.
- Guia de trabajo futuro en `docs/architecture.md` con reglas de ownership, capas y checklist para nuevas rutas o refactors.
- Seccion de referencia rapida en `docs/README.md` para tocar estructura, APIs y validaciones del proyecto.
- Regla de trabajo y patron de reexport en `src/app/api/README.md`.

### Changed

- `docs/README.md`: indice actualizado con jerarquia MVZ, referencia a modulos archivados, cierre de la normalizacion estructural y guia rapida para futuras contribuciones.
- `docs/architecture.md`: estructura real de rutas MVZ por rancho, ownership final de la refactor, estructura final de carpetas y nueva guia de trabajo por capas.
- `docs/routing.md`: rutas nuevas `/mvz/ranchos/[uppId]/*` y politica de redirects legacy.
- `docs/setup.md`: orden de migraciones actualizado (`migration_001`, `migration_002`, `views`, `seeds`).
- `docs/multitenancy.md`: separacion entre contexto tenant y contexto de rancho MVZ.
- `docs/auth-admin.md`: permisos y autorizacion por `scope.uppId`.
- `docs/tenant-iam.md`: catalogo de permisos `mvz.ranch.*`.
- `docs/prisma-from-sql.md`: nota SQL-first para tablas nuevas de MVZ jerarquico.
- `src/app/api/README.md`: refleja el ownership final de las familias API normalizadas y el patron esperado de entrypoints delgados.
- `docs/setup.md`: orden SQL actualizado para incluir `sql/migration_003_fix_rls_politicies.sql` como correccion de recursion RLS.
- `docs/security/security.md`: documenta la causa, sintoma y remediacion del error PostgreSQL `42P17` por policies recursivas sobre `public.tenants`.
- `docs/troubleshooting-login.md`: agrega el caso donde productor entra correctamente pero ve `0` ranchos por fallo RLS en `resolveAccessibleUppIds()`.

## [2026-02-24]

### Added

- `docs/README.md`: indice de documentacion.
- `docs/architecture.md`: estructura y reglas arquitectonicas.
- `docs/prisma-from-sql.md`: mapeo Prisma desde SQL y notas de compatibilidad.
- `docs/multitenancy.md`: flujo de resolucion de tenant y middleware.
- `docs/setup.md`: setup local y comandos operativos.
