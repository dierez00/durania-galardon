Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Active route map, legacy redirects, and guard expectations for the current application.

# Rutas y guards

## Vista general

- Publico: `/` y `/login`
- Admin tenant: `/admin/*`
- Operacion tenant:
  - Productor: `/producer/*`
  - MVZ: `/mvz/*`

## Rutas por panel

- `tenant_admin`
  - `/admin`
  - `/admin/producers`
  - `/admin/producers/new`
  - `/admin/mvz`
  - `/admin/mvz/new`
  - `/admin/quarantines`
  - `/admin/exports`
  - `/admin/normative`
  - `/admin/audit`
  - `/admin/appointments`

- `producer` y `employee`
  - Organizacion
    - `/producer`
    - `/producer/metrics`
    - `/producer/settings`
  - Proyecto
    - `/producer/projects/[uppId]`
    - `/producer/projects/[uppId]/animales`
    - `/producer/projects/[uppId]/animales/[id]`
    - `/producer/projects/[uppId]/movilizacion`
    - `/producer/projects/[uppId]/exportaciones`
    - `/producer/projects/[uppId]/documentos`
    - `/producer/projects/[uppId]/details`
  - Compatibilidad
    - `/producer/dashboard`
    - `/producer/ranchos`
    - `/producer/ranchos/[uppId]`
    - `/producer/bovinos`
    - `/producer/movilizacion`
    - `/producer/exportaciones`
    - `/producer/documentos`
    - `/producer/empleados`

- `mvz_government` y `mvz_internal`
  - Organizacion
    - `/mvz`
    - `/mvz/metrics`
    - `/mvz/settings`
  - Proyecto
    - `/mvz/ranchos/[uppId]`
    - `/mvz/ranchos/[uppId]/animales`
    - `/mvz/ranchos/[uppId]/historial-clinico`
    - `/mvz/ranchos/[uppId]/vacunacion`
    - `/mvz/ranchos/[uppId]/incidencias`
    - `/mvz/ranchos/[uppId]/reportes`
    - `/mvz/ranchos/[uppId]/documentacion`
    - `/mvz/ranchos/[uppId]/visitas`
  - Compatibilidad
    - `/mvz/dashboard`
    - `/mvz/ranchos`
    - `/mvz/asignaciones`
    - `/mvz/pruebas`
    - `/mvz/exportaciones`

## Compatibilidad legacy

### Productor

Estas rutas se mantienen como shims y resuelven al proyecto activo cuando existe:

- `/producer/dashboard` -> `/producer/projects/[selectedUppId]`
- `/producer/bovinos` -> `/producer/projects/[selectedUppId]/animales`
- `/producer/movilizacion` -> `/producer/projects/[selectedUppId]/movilizacion`
- `/producer/exportaciones` -> `/producer/projects/[selectedUppId]/exportaciones`
- `/producer/documentos` -> `/producer/projects/[selectedUppId]/documentos`
- `/producer/ranchos` -> `/producer`
- `/producer/ranchos/[uppId]` -> `/producer/projects/[uppId]`
- `/producer/empleados` -> `/producer/settings`

Si no hay `selectedUppId` persistido, redirigen a `/producer`.

### MVZ

Estas rutas se mantienen, pero redirigen a la jerarquia nueva:

- `/mvz/asignaciones` -> `/mvz/ranchos/[selectedUppId]`
- `/mvz/pruebas` -> `/mvz/ranchos/[selectedUppId]/historial-clinico`
- `/mvz/exportaciones` -> `/mvz/ranchos/[selectedUppId]/reportes`
- `/mvz/dashboard` -> `/mvz/metrics`

Si no hay `selectedUppId` persistido, redirigen a `/mvz`.

## Shell tenant

`src/app/(tenant)/layout.tsx` monta un shell comun con dos modos:

- Organizacion: sidebar global (`Projects`, `Metricas`, `Configuracion`) y home tenant.
- Proyecto: breadcrumb contextual, selector de proyecto y sidebar por actor/permisos.

La composicion del shell vive en `src/modules/workspace/*` y `src/shared/ui/layout/*`.

## Guards principales

- `src/app/(tenant)/layout.tsx`
  - valida sesion
  - resuelve rol tenant
  - valida permisos por segmentos de ruta (`/producer/projects/[uppId]/animales`, `/mvz/ranchos/[uppId]/vacunacion`, etc.)
- `src/server/authz/index.ts`
  - aplica `roles`, `permissions` y `scope.uppId`
  - bloquea acceso a proyectos no asignados o fuera del tenant
