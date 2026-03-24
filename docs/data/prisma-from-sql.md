Status: Canonical
Owner: Engineering
Last Updated: 2026-03-23
Source of Truth: Canonical guidance for how Prisma relates to the SQL-first Supabase schema in this repository.

# Prisma y SQL

## Fuente de verdad

El modelo operativo se mantiene en SQL para Supabase.

Migraciones activas:

- `sql/migration_001_duraniaMVP.sql`
- `sql/migration_002_mvz_hierarchy.sql`
- `sql/migration_003_fix_rls_politicies.sql`
- `sql/migration_004_settings_profile_split.sql`
- `sql/migration_005_mvz_settings_permissions_backfill.sql`
- `sql/migration_006_tenant_custom_roles.sql`
- `sql/migration_007_add_iot_telemetry_tables.sql`
- `sql/views.sql`
- `sql/seeds.sql`

Archivo Prisma actual:

- `prisma/schema.prisma`

## Variables de entorno para Prisma

- `DATABASE_URL`
- `DATABASE_URL_DIRECT`

## Comandos utiles

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

## Piezas SQL-first (no gestionadas por Prisma)

- Trigger `handle_new_user` en `auth.users`.
- Funciones y politicas RLS.
- Vistas de reporting MVZ y dashboards.
- Publicacion realtime (`supabase_realtime`).

## Nota sobre MVZ jerarquico

La implementacion jerarquica MVZ usa cliente Supabase (RLS) para tablas nuevas (`mvz_visits`, `animal_vaccinations`, `sanitary_incidents`, `upp_documents`).

Si quieres reflejarlas en Prisma, regenera `prisma/schema.prisma` desde la BD actualizada.

## Nota sobre IoT y telemetría

La migración `sql/20260323_add_iot_telemetry_tables.sql` agrega:

- `public.collars`
- `public.collar_animal_history`
- `public.telemetry`

En `prisma/schema.prisma` ya están reflejadas como modelos `collars`, `collar_animal_history` y `telemetry`.

Recordatorio SQL-first:

- Políticas RLS (`CREATE POLICY`) se mantienen en SQL.
- Grants a roles (`authenticated`, `anon`) se mantienen en SQL.
- Permisos de secuencia (`telemetry_id_seq`) se mantienen en SQL.

Si se cambia estructura o políticas de estas tablas en SQL, ejecutar:

```bash
npx prisma db pull
npx prisma format
npx prisma validate
```
