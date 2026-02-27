# API endpoints

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
- `GET|POST /api/producer/bovinos`
- `GET|POST /api/producer/movements`
- `GET|POST /api/producer/exports`
- `GET|POST|PATCH /api/producer/documents`
- `GET|POST|PATCH /api/producer/employees`

## MVZ

- `GET /api/mvz/dashboard`
- `GET /api/mvz/assignments`
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

## Public

- `POST /api/public/appointments`
