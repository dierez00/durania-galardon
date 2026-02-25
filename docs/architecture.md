# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/
      page.tsx                     # landing publica + wizard + CRM
      login/page.tsx               # login unico
    (admin)/
      admin/
        (protected)/
          layout.tsx
          panel/page.tsx
          users/page.tsx
          producers/page.tsx
          mvz/page.tsx
          upps/page.tsx
          quarantines/page.tsx
          exports/page.tsx
          normative/page.tsx
          audit/page.tsx
          reports/page.tsx
          settings/page.tsx
    (tenant)/
      layout.tsx                   # guardia tenant por rol y permisos
      producer/*                   # vistas de productor/empleado
      mvz/*                        # vistas de MVZ
      _legacy/*.tsx                # componentes legacy sin routing directo
    api/
      auth/
      admin/
      producer/
      mvz/
      tenant/
      public/
  server/
    auth/
    tenants/
    middleware/
    authz/
    audit/
    reports/
  shared/
    lib/
    config/
    ui/
sql/
  durania_mvp_migration_v2.sql
  durania_mvp_migration_v3_tenant_iam.sql
  durania_mvp_migration_v4_rbac_modules.sql
```

## Modelo de acceso

- Resolucion de tenant por subdominio/header/fallback local.
- Roles por tenant (`tenant_roles` + `tenant_user_roles`).
- Login unico con redireccion por rol tenant.
- Guardias en layouts:
  - `tenant_admin` solo en `/admin/*`.
  - `producer|employee` en `/producer/*`.
  - `mvz_government|mvz_internal` en `/mvz/*`.
- Autorizacion fina por permisos en `src/server/authz`.

## Migracion IAM v3

La migracion `sql/durania_mvp_migration_v3_tenant_iam.sql` agrega:

- `tenants`
- `tenant_memberships`
- `tenant_roles`
- `tenant_role_permissions`
- `tenant_user_roles`
- `appointment_requests`

Y agrega `tenant_id` + backfill a tablas operativas:

- `producers`, `upps`, `user_upp_access`, `mvz_profiles`, `mvz_upp_assignments`,
  `producer_documents`, `animals`, `field_tests`.

## APIs principales

- Auth:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Admin usuarios:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/:id/status`
- Tenant IAM:
  - `GET/POST /api/tenant/iam/memberships`
  - `GET/POST/PATCH /api/tenant/iam/roles`
  - `PUT /api/tenant/iam/roles/:id/permissions`
  - `POST /api/tenant/upp-access`
  - `POST /api/tenant/mvz-assignments`
- Citas:
  - `POST /api/public/appointments`
  - `GET/PATCH /api/tenant/appointments`

## Corte limpio de rutas tenant

- Las rutas tenant legacy directas fueron retiradas.
- El acceso tenant queda acotado a:
  - `/producer/*`
  - `/mvz/*`
- La separacion de vistas ahora se implementa con segmentos reales:
  - `src/app/(tenant)/producer/*`
  - `src/app/(tenant)/mvz/*`
