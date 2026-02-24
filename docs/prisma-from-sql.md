# Prisma y SQL

## Fuente de verdad

El schema Prisma fue generado a partir de:

- `sql/durania_mvp_migration_v2.sql`

Archivo actual:

- `prisma/schema.prisma`

## Variables de entorno para Prisma

Usadas por Prisma:

- `DATABASE_URL`
- `DATABASE_URL_DIRECT` (asignada a `directUrl`)

Notas:

- Variables `NEXT_PUBLIC_*` y `SUPABASE_SERVICE_ROLE_KEY` no son usadas por Prisma.
- Prisma CLI lee `.env` en la raiz del proyecto.

## Comandos utiles

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

## Lo que no representa Prisma (se mantiene en SQL)

- Trigger `handle_new_user` sobre `auth.users`.
- Funciones/politicas RLS.
- Indice parcial:
  - `producer_documents_current_unique` (`WHERE is_current = TRUE`).

Estas piezas deben mantenerse en migraciones SQL para Supabase.
