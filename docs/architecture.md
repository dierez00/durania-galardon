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
          producers/new/page.tsx
          mvz/page.tsx
          mvz/new/page.tsx
          upps/page.tsx
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