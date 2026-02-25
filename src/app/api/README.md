# API routes

Use `/api/<module>` for handlers. Keep handlers thin and delegate to domain/application services.

Current auth/admin routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/status`

Tenant IAM and CRM routes:

- `GET /api/tenant/iam/memberships`
- `POST /api/tenant/iam/memberships`
- `GET /api/tenant/iam/roles`
- `POST /api/tenant/iam/roles`
- `PATCH /api/tenant/iam/roles`
- `PUT /api/tenant/iam/roles/:id/permissions`
- `POST /api/tenant/upp-access`
- `POST /api/tenant/mvz-assignments`
- `GET /api/tenant/appointments`
- `PATCH /api/tenant/appointments`
- `POST /api/public/appointments`
