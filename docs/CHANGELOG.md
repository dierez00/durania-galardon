Status: History
Owner: Engineering
Last Updated: 2026-03-23
Source of Truth: Historical log of documentation-only changes. Current operational guidance lives in `docs/README.md` and the linked canonical docs.

# Docs Changelog

## [Unreleased]

### Added

- `docs/architecture/ui-color-system.md`: documenta la paleta canonica, tokens globales, tonos semanticos, reglas de consumo y el guard `npm run check:ui-colors`.
- `src/app/api/README.md`: agrega ownership y contratos para `auth/password/recovery` y `auth/invite-context`.
- `docs/architecture/tenant-iam.md`: documenta roles base protegidos, roles custom `custom_<slug>`, permisos `producer.roles.*` y `mvz.roles.*`, y nuevos endpoints de roles por tenant.
- `src/app/api/README.md`: agrega ownership y contratos para `producer/roles`, `mvz/roles` y `producer/settings/ranchos`.
- `docs/architecture/mvz-hierarchy.md`: guia funcional y tecnica del flujo MVZ jerarquico (dashboard global + panel por rancho).
- Documentacion de APIs jerarquicas en `docs/architecture/auth-admin.md` y `docs/data/database.md`.
- Seccion de actualizacion v6 en `docs/data/database.md` con tablas, vistas, permisos, RLS y realtime.
- `docs/architecture/archived-modules.md`: registro de modulos scaffold retirados del codigo activo y criterio para archivarlos.
- Guia de trabajo futuro en `docs/architecture/overview.md` con reglas de ownership, capas y checklist para nuevas rutas o refactors.
- Seccion de referencia rapida en `docs/README.md` para tocar estructura, APIs y validaciones del proyecto.
- Regla de trabajo y patron de reexport en `src/app/api/README.md`.

### Changed

- `docs/README.md`: indexa el sistema de color UI como documentacion canonica de arquitectura.
- `docs/architecture/overview.md`: registra `src/shared/ui/theme` y el guard `scripts/check-ui-colors.mjs` como parte de la arquitectura frontend compartida.
- `docs/architecture/auth-admin.md`: documenta el flujo de invitacion/recovery, las rutas publicas `/forgot-password` y `/auth/set-password`, y el endpoint `GET /api/auth/invite-context`.
- `docs/guides/setup.md`: agrega `NEXT_PUBLIC_SITE_URL`, requisitos de Redirect URLs/Auth templates en Supabase y actualiza el redirect MVZ esperado a `/mvz`.
- `docs/architecture/auth-admin.md`: actualiza routing tenant basado en permisos reales, payload expandido de `GET /api/auth/me`, tabs de settings y restricciones especiales de `mvz_internal`.
- `docs/architecture/routing.md`: documenta acceso a settings por permisos de tabs, landing por panel/permisos y el comportamiento de `/mvz` para `mvz_internal`.
- `docs/architecture/overview.md`: registra `src/modules/iam`, los owners de `producer/roles`, `mvz/roles` y `producer/settings/ranchos`, y el helper transversal `src/server/authz/tenantRoles.ts`.
- `docs/data/database.md`: extiende el catalogo de permisos con `producer.roles.*` y `mvz.roles.*`, y actualiza la seccion de `tenant_roles` para roles custom por tenant.
- `docs/architecture/routing.md`: documenta el split `Mi perfil` vs `Configuracion del panel`, las rutas `/producer/profile` y `/mvz/profile`, y los guards nuevos por permisos `*.tenant.read`.
- `docs/architecture/auth-admin.md`: actualiza roles soportados, redirects reales (`/producer`, `/mvz`) y endpoints nuevos de perfil/equipo MVZ.
- `docs/architecture/tenant-iam.md`: agrega `producer_viewer`, permisos `producer.tenant.*`, `mvz.tenant.*`, `mvz.profile.*`, `mvz.members.*` y el cambio de `auth_mvz_assigned_to_upp()` a membresia tenant-based.
- `docs/architecture/overview.md` y `src/app/api/README.md`: reflejan ownership de `producer/profile`, `mvz/profile` y `mvz/members`.
- `docs/data/database.md`: actualiza el catalogo de roles/permisos tenant y documenta `profiles.email` como espejo de `auth.users.email`.
- `docs/architecture/routing.md`: actualiza el mapa tenant a navegacion de dos niveles (`/producer` y `/mvz` como home organizacional, rutas de proyecto y redirects legacy).
- `docs/architecture/multitenancy.md`: documenta el workspace de dos niveles, persistencia de proyecto activo y uso de `tenant.name` desde `GET /api/auth/me`.
- `docs/architecture/routing.md`: documenta el shell tenant compacto, el breadcrumb `Inicio > proyecto actual` y la eliminacion del badge/selector separado en topbar.
- `docs/architecture/multitenancy.md`: aclara que el cambio de proyecto/ranchos ocurre desde un dropdown inline en el breadcrumb y no desde un selector secundario.
- `docs/architecture/mvz-hierarchy.md`: reemplaza la referencia al selector embebido en `/mvz/dashboard` por el flujo real `/mvz` -> `/mvz/ranchos/[uppId]` con cambio contextual desde la topbar.
- `src/app/api/README.md`: agrega ownership y contratos de `producer/settings`, `mvz/settings` y filtros `?uppId=` para APIs de proyecto.
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
