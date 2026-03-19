# API endpoints

`src/app/api` conserva los contratos HTTP publicos y privados, pero sus archivos deben limitarse a reexportar handlers desde los modulos duenos.

## Regla de trabajo

- Cada `route.ts` debe ser un entrypoint delgado.
- La logica de negocio y los queries viven en `src/modules/*`.
- Si un helper es transversal de backend, va en `src/server/*`.
- Cuando agregues o muevas una familia API, actualiza este archivo y `docs/architecture/overview.md`.

## Ownership por capacidad

- `admin/producers` -> `src/modules/admin/productores`
- `admin/mvz` -> `src/modules/admin/mvz`
- `admin/appointments` y `public/appointments` -> `src/modules/admin/citas`
- `admin/audit` -> `src/modules/admin/auditoria`
- `producer/bovinos` -> `src/modules/bovinos`
- `producer/documents` y `producer/upp-documents` -> `src/modules/producer/documents`
- `producer/settings` -> `src/modules/producer/settings`
- `producer/upp` -> `src/modules/producer/ranchos`
- `mvz/assignments` -> `src/modules/ranchos`
- `mvz/settings` -> `src/modules/mvz/settings`

## Patron esperado

```ts
export { GET, POST, PATCH } from "@/modules/<owner>/<feature>";
```

Si el modulo aun no expone alias desde `index.ts`, el reexport puede apuntar temporalmente a `infra/http/*Handlers`.

## Auth/Tenant

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/tenant/resolve`

## Admin

- `GET /api/admin/dashboard`
- `GET|POST|PATCH /api/admin/producers`
- `POST /api/admin/producers/batch`
- `GET|POST|PATCH /api/admin/mvz`
- `POST /api/admin/mvz/batch`
- `GET|POST|PATCH /api/admin/quarantines`
- `GET|POST|PATCH /api/admin/exports`
- `GET|POST|PATCH /api/admin/normative`
- `GET /api/admin/audit`
- `GET|PATCH /api/admin/appointments`

## Producer

- `GET /api/producer/dashboard`
- `GET /api/producer/upp`
- `GET|PATCH /api/producer/settings`
- `GET|POST /api/producer/bovinos`
- `GET|POST /api/producer/movements`
- `GET|POST /api/producer/exports`
- `GET|POST|PATCH /api/producer/documents`
- `GET|POST /api/producer/upp-documents`
- `GET|POST|PATCH /api/producer/employees`

### Scope de proyecto productor

Cuando la UI esta en `/producer/projects/[uppId]/*`, estas APIs aceptan `?uppId=` y deben responder filtradas al proyecto activo:

- `GET /api/producer/bovinos`
- `GET /api/producer/movements`
- `GET /api/producer/exports`
- `GET /api/producer/upp-documents`

## MVZ

- `GET /api/mvz/dashboard`
- `GET /api/mvz/assignments`
- `GET|PATCH /api/mvz/settings`
- `GET|POST /api/mvz/tests`
- `POST /api/mvz/tests/sync`
- `GET|PATCH /api/mvz/exports`
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

### Shell tenant

`GET /api/auth/me` alimenta el shell tenant y debe incluir `panelType`, `permissions` y `tenant.name` para renderizar el contexto organizacional correcto.

## Public

- `POST /api/public/appointments`
