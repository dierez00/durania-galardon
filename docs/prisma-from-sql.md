# Prisma y SQL

## Fuente de verdad

El modelo operativo se mantiene en SQL para Supabase.

Migraciones activas:

- `sql/migration_001_duraniaMVP.sql`
- `sql/migration_002_mvz_hierarchy.sql`
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
