# Durania

Durania es una app Next.js (App Router) con Supabase Auth + PostgreSQL para paneles multi-tenant:

- `Admin` (`tenant_admin`)
- `Producer` (`producer`, `employee`)
- `MVZ` (`mvz_government`, `mvz_internal`)

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run test
```

## Mapa de rutas

- Publico
  - `/`
  - `/login`
- Admin
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
- Producer
  - `/producer/dashboard`
  - `/producer/ranchos`
  - `/producer/bovinos`
  - `/producer/movilizacion`
  - `/producer/exportaciones`
  - `/producer/documentos`
  - `/producer/empleados`
- MVZ
  - `/mvz/dashboard`
  - `/mvz/asignaciones`
  - `/mvz/pruebas`
  - `/mvz/exportaciones`

## API pública y paneles

- Auth/Tenant
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/tenant/resolve`
- Admin
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
- Producer
  - `GET /api/producer/dashboard`
  - `GET /api/producer/upp`
  - `GET|POST /api/producer/bovinos`
  - `GET|POST /api/producer/movements`
  - `GET|POST /api/producer/exports`
  - `GET|POST|PATCH /api/producer/documents`
  - `GET|POST|PATCH /api/producer/employees`
- MVZ
  - `GET /api/mvz/dashboard`
  - `GET /api/mvz/assignments`
  - `GET|POST /api/mvz/tests`
  - `POST /api/mvz/tests/sync`
  - `GET|PATCH /api/mvz/exports`
- Public
  - `POST /api/public/appointments`
