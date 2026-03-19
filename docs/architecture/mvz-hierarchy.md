Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Canonical description of the active MVZ global-to-ranch workflow and its API surface.

# MVZ Jerarquico (Gobierno -> Rancho)

## Objetivo

Implementar una experiencia jerarquica para MVZ:

1. Panel global (`/mvz/dashboard`) con selector de ranchos y KPIs agregados.
2. Panel contextual por rancho (`/mvz/ranchos/[uppId]/*`) con modulos internos.

## Flujo de usuario

1. Login.
2. Entrada a `/mvz/dashboard`.
3. Visualizacion de KPIs globales + ranchos asignados.
4. Seleccion de rancho.
5. Navegacion a `/mvz/ranchos/[uppId]`.
6. Uso de tabs internas del rancho.

## Persistencia de seleccion

- Fuente de verdad: URL (`uppId` en la ruta).
- Persistencia auxiliar: `sessionStorage`.
- Clave: `mvz:selectedUppId:<tenantId>`.

## Modulos por rancho

- `resumen` (overview + KPIs)
- `animales`
- `historial-clinico`
- `vacunacion`
- `incidencias`
- `reportes`
- `documentacion`
- `visitas`

## APIs

- `GET /api/mvz/dashboard` -> `kpisGlobales` + `ranchosAsignados`
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

## Seguridad

- Todos los endpoints usan `requireAuthorized` con:
  - rol MVZ
  - permisos del modulo
  - `scope.uppId`
- RLS en tablas nuevas restringe a UPPs asignadas (`auth_mvz_assigned_to_upp`).

## Realtime

- Hook cliente: `useMvzRealtime`.
- Suscripciones `postgres_changes` sobre tablas MVZ/UPP relevantes.
- Re-fetch automatico al detectar eventos.

## Compatibilidad legacy

Rutas previas MVZ siguen accesibles pero redirigen:

- `/mvz/asignaciones`
- `/mvz/pruebas`
- `/mvz/exportaciones`

Si no hay rancho seleccionado, redirigen a `/mvz/dashboard?selectRancho=1`.
