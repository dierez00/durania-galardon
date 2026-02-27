# Rutas y guards

## Vista general

- Publico: `/` y `/login`
- Admin tenant: `/admin/*`
- Operacion tenant:
  - Productor: `/producer/*`
  - MVZ: `/mvz/dashboard` + `/mvz/ranchos/[uppId]/*`

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
  - `/producer/dashboard`
  - `/producer/ranchos`
  - `/producer/bovinos`
  - `/producer/movilizacion`
  - `/producer/exportaciones`
  - `/producer/documentos`
  - `/producer/empleados`

- `mvz_government` y `mvz_internal`
  - `/mvz/dashboard`
  - `/mvz/ranchos`
  - `/mvz/ranchos/[uppId]`
  - `/mvz/ranchos/[uppId]/animales`
  - `/mvz/ranchos/[uppId]/historial-clinico`
  - `/mvz/ranchos/[uppId]/vacunacion`
  - `/mvz/ranchos/[uppId]/incidencias`
  - `/mvz/ranchos/[uppId]/reportes`
  - `/mvz/ranchos/[uppId]/documentacion`
  - `/mvz/ranchos/[uppId]/visitas`

## Compatibilidad legacy MVZ

Estas rutas se mantienen, pero redirigen a la jerarquia nueva:

- `/mvz/asignaciones` -> `/mvz/ranchos/[selectedUppId]`
- `/mvz/pruebas` -> `/mvz/ranchos/[selectedUppId]/historial-clinico`
- `/mvz/exportaciones` -> `/mvz/ranchos/[selectedUppId]/reportes`

Si no hay `selectedUppId` persistido, redirigen a `/mvz/dashboard?selectRancho=1`.

## Guards principales

- `src/app/(tenant)/layout.tsx`
  - valida sesion
  - resuelve rol tenant
  - valida permisos por prefijo de ruta
- `src/server/authz/index.ts`
  - aplica `roles`, `permissions` y `scope.uppId`
  - bloquea acceso a ranchos no asignados
