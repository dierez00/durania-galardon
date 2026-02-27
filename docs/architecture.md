# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/
      page.tsx
      login/page.tsx
    (admin)/
      admin/
        (protected)/
          page.tsx
          producers/page.tsx
          mvz/page.tsx
          quarantines/page.tsx
          exports/page.tsx
          normative/page.tsx
          audit/page.tsx
          appointments/page.tsx
    (tenant)/
      layout.tsx
      producer/*
      mvz/
        dashboard/page.tsx
        ranchos/page.tsx
        ranchos/[uppId]/page.tsx
        ranchos/[uppId]/[tab]/page.tsx
        _components/LegacyMvzRedirect.tsx
        asignaciones/page.tsx    # redirect legacy
        pruebas/page.tsx         # redirect legacy
        exportaciones/page.tsx   # redirect legacy
    api/
      auth/*
      admin/*
      producer/*
      mvz/
        dashboard/route.ts
        assignments/route.ts
        tests/route.ts
        exports/route.ts
        ranchos/[uppId]/*
  server/
    auth/
    authz/
    tenants/
    middleware/
    audit/
  shared/
    hooks/
      use-mvz-ranch-context.tsx
      use-mvz-realtime.ts
    lib/
    ui/
sql/
  migration_001_duraniaMVP.sql
  migration_002_mvz_hierarchy.sql
  views.sql
  seeds.sql
```

## Modelo de acceso

- Resolucion de tenant por subdominio/header/fallback local.
- Roles por tenant (`tenant_roles` + `tenant_user_roles`).
- Login unico con redireccion por rol.
- Guardias por layout y permisos por ruta.
- Scope por rancho (`uppId`) para endpoints MVZ jerarquicos.

## Jerarquia MVZ

- Nivel 1: `/mvz/dashboard`
  - KPIs globales del MVZ.
  - Selector/listado de ranchos asignados.
- Nivel 2: `/mvz/ranchos/[uppId]/*`
  - Contexto fijo de rancho.
  - Modulos: resumen, animales, historial clinico, vacunacion, incidencias, reportes, documentacion, visitas.

## Capas backend relevantes

- `src/server/authz`: autorizacion por rol/permisos + scope UPP.
- `src/app/api/mvz/ranchos/_utils.ts`: validador comun para endpoints scoped.
- `sql/migration_002_mvz_hierarchy.sql`: tablas MVZ jerarquicas + RLS + permisos + realtime publication.
- `sql/views.sql`: vistas agregadas para dashboard global y panel de rancho.
