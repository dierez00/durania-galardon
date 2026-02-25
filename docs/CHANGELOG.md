# Docs Changelog

## [Unreleased]

### Added

- `docs/auth-admin.md`: modelo tenant IAM, login unico y endpoints IAM/CRM.
- Documentacion de rutas visibles por rol: `/producer/*` y `/mvz/*`.
- `docs/tenant-iam.md`: entidades, flujos y politicas del modelo IAM por tenant.
- `docs/routing.md`: matriz de rutas por rol y guards de App Router.
- `docs/troubleshooting-login.md`: guia operativa para errores de login y tenant.

### Changed

- `docs/architecture.md`: estructura App Router con modulo admin tenant, APIs IAM y migracion SQL v3.
- `docs/setup.md`: secuencia de migraciones (`v2` + `v3`) y roles tenant de sistema.
- `docs/README.md`: resumen actualizado de rutas y capacidades tenant IAM.
- `docs/tenant-iam.md`: politica de rutas depurada sin rutas tenant legacy.
- `docs/multitenancy.md`: fallback local documentado (`DEFAULT_TENANT_SLUG` -> `default-tenant`).
- `docs/auth-admin.md`: flujo de login detallado + catalogo de errores frecuentes.

## [2026-02-24]

### Added

- `docs/README.md`: indice de documentacion.
- `docs/architecture.md`: estructura y reglas arquitectonicas.
- `docs/prisma-from-sql.md`: mapeo Prisma desde SQL y notas de compatibilidad.
- `docs/multitenancy.md`: flujo de resolucion de tenant y middleware.
- `docs/setup.md`: setup local y comandos operativos.
