# API routes

Use `/api/<module>` for handlers. Keep handlers thin and delegate to domain/application services.

Current auth/admin routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/status`
