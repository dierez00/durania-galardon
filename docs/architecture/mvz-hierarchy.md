Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Canonical description of the active MVZ global-to-ranch workflow and its API surface.

# MVZ Jerarquico (Gobierno -> Rancho)

## Objetivo

Implementar una experiencia jerarquica para MVZ:

1. Home organizacional (`/mvz`) con lista de ranchos asignados.
2. Vista global de metricas (`/mvz/metrics`) con KPIs agregados.
3. Cambio de rancho desde el shell contextual (`Inicio > rancho actual`) una vez dentro del panel por rancho.
2. Panel contextual por rancho (`/mvz/ranchos/[uppId]/*`) con modulos internos.

## Flujo de usuario

1. Login.
2. Entrada a `/mvz`.
3. Visualizacion de ranchos asignados o KPIs globales en `/mvz/metrics`.
4. Apertura de un rancho.
5. Navegacion a `/mvz/ranchos/[uppId]`.
6. Cambio de rancho desde el breadcrumb inline cuando ya existe contexto activo.
7. Uso de tabs internas del rancho.

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
- `/mvz/dashboard`

- `/mvz/dashboard` redirige a `/mvz/metrics`.
- Si no hay rancho seleccionado, las rutas legacy contextuales redirigen a `/mvz?selectRancho=1`.
