# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/*
    (admin)/admin/(protected)/*
    (tenant)/producer/*
    (tenant)/mvz/*
    _components/
      AppSidebar.tsx
    api/
      auth/*
      public/*
      tenant/*
      admin/*
      producer/*
      mvz/*
  modules/
    admin/
      auditoria/
      citas/
      dashboard/
      mvz/
      normativa/
      productores/
    producer/
      dashboard/
      documents/
      empleados/
      movilizacion/
      productores/
      ranchos/
    mvz/
      dashboard/
    bovinos/
    cuarentenas/
      admin/
    exportaciones/
      admin/
      mvz/
    pruebas/
      mvz/
    ranchos/
    usuarios/
  server/
    auth/
    authz/
    audit/
    db/
    middleware/
    reports/
    tenants/
  shared/
    config/
    lib/
    ui/
sql/
```

## Reglas de ownership

- `src/app` contiene entrypoints, layouts, redirects y composición local de ruta.
- `src/app/api` contiene entrypoints HTTP delgados que reexportan handlers desde `src/modules`.
- `src/modules` es el dueño de la lógica de negocio, la presentación feature-owned y los handlers HTTP por capacidad.
- `src/shared` queda reservado para utilidades, config y UI neutral sin dependencia hacia módulos.
- `src/server` conserva solo infraestructura transversal de backend.

## Owners activos

- `src/modules/admin`
  - `auditoria`, `citas`, `dashboard`, `mvz`, `normativa`, `productores`
- `src/modules/producer`
  - `dashboard`, `documents`, `empleados`, `movilizacion`, `productores`, `ranchos`
- `src/modules/mvz`
  - `dashboard`
- `src/modules`
  - `bovinos`
  - `cuarentenas`
    - `admin/*` concentra la slice específica de admin dentro del owner compartido
  - `exportaciones`
    - `admin/*` y `mvz/*` concentran slices específicas por actor dentro del owner compartido
  - `pruebas`
    - `mvz/*` concentra handlers y flujos MVZ del dominio sanitario
  - `ranchos`
    - contiene acceso MVZ, contexto MVZ y presentación compartida por actor
  - `usuarios`

## Cambios relevantes de esta refactorización

- El estado actor-specific de MVZ y producer salió de `src/shared/hooks` y ahora vive en sus módulos dueños.
- El sidebar dejó de mezclar UI neutral con permisos y navegación; la shell reusable vive en `src/shared/ui/layout/SidebarShell.tsx` y la configuración en `src/app/_components/AppSidebar.tsx`.
- Producer dashboard, empleados, movilización y exportaciones dejaron de vivir directamente en `src/app` y `src/app/api`.
- MVZ dashboard, exportaciones, pruebas y el helper de acceso a ranchos salieron de `src/app/api` hacia `src/modules/mvz`, `src/modules/exportaciones`, `src/modules/pruebas` y `src/modules/ranchos`.
- Admin dashboard dejó `src/app`, y las capacidades compartidas `exportaciones` y `cuarentenas` ya no viven bajo `src/modules/admin`; sus entrypoints HTTP ahora delegan a `src/modules/exportaciones/*/infra/http` y `src/modules/cuarentenas/admin/infra/http`.
- Los módulos scaffold archivados se documentan en `docs/archived-modules.md` y salen del código activo.

## Pendiente para completar la normalización

- `src/app/api/admin/producers/*` y `src/app/api/admin/mvz/*` todavía contienen lógica de negocio y queries directas; falta mover esos handlers hacia `src/modules/admin/productores` y `src/modules/admin/mvz`.
- `src/app/api/producer/bovinos/*`, `src/app/api/producer/documents/*`, `src/app/api/producer/upp*` y `src/app/api/producer/upp-documents*` siguen mezclando entrypoint y lógica feature-owned; falta delegarlos a `src/modules/bovinos`, `src/modules/producer/documents` y `src/modules/producer/ranchos`.
- `src/app/api/admin/appointments/route.ts`, `src/app/api/admin/audit/route.ts`, `src/app/api/mvz/assignments/route.ts` y `src/app/api/public/appointments/route.ts` siguen inline; falta decidir si permanecen como infraestructura o si conviene darles owner explícito en `src/modules`.
- La limpieza de módulos archivados quedó completa en código versionado, pero si algunos directorios vacíos siguen apareciendo localmente deben eliminarse del filesystem para que el árbol local refleje exactamente la arquitectura documentada.
- La refactor ya dejó `index.ts` en paquetes actor como `src/modules/producer` y `src/modules/mvz`, pero todavía hay imports profundos que pueden simplificarse en una pasada posterior para reforzar las superficies públicas de módulo.

## Notas MVZ legacy

- `/mvz/asignaciones`, `/mvz/pruebas` y `/mvz/exportaciones` se conservan como redirects funcionales.
- La implementación de esos redirects vive en `src/modules/ranchos/presentation/mvz/LegacyMvzRedirect.tsx`.
