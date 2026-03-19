Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Active architecture, ownership rules, and layering conventions for the application.

# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/*
    (admin)/admin/(protected)/*
    (tenant)/producer/*
    (tenant)/mvz/*
    _components/*
    api/*
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
    exportaciones/
    pruebas/
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

## Regla central

- `src/app` contiene entrypoints de paginas, layouts, redirects y composicion local.
- `src/app/api` contiene entrypoints HTTP delgados y reexports.
- `src/modules` contiene negocio, presentacion feature-owned, handlers HTTP y adaptadores por capacidad.
- `src/server` contiene infraestructura transversal de backend.
- `src/shared` contiene utilidades, config y UI neutral sin ownership de negocio.

## Que quedo hecho

La normalizacion pendiente quedo cerrada en estas familias:

- `src/app/api/admin/producers/*` -> `src/modules/admin/productores/infra/http`
- `src/app/api/admin/mvz/*` -> `src/modules/admin/mvz/infra/http`
- `src/app/api/producer/bovinos/*` -> `src/modules/bovinos/infra/http`
- `src/app/api/producer/documents/*` -> `src/modules/producer/documents/infra/http`
- `src/app/api/producer/upp-documents/*` -> `src/modules/producer/documents/infra/http`
- `src/app/api/producer/upp/*` -> `src/modules/producer/ranchos/infra/http`
- `src/app/api/admin/appointments` y `src/app/api/public/appointments` -> `src/modules/admin/citas/infra/http`
- `src/app/api/admin/audit` -> `src/modules/admin/auditoria/infra/http`
- `src/app/api/mvz/assignments` -> `src/modules/ranchos/infra/http`

Tambien quedaron consolidados estos owners transversales:

- `src/server/auth/provisioning` para helpers compartidos de Auth/GoTrue.
- `src/server/admin/provisioning` solo para utilidades genericas de tenant, membership y roles.
- `src/modules/ranchos/infra/api/mvzAssignments.ts` como query compartido entre `mvz/assignments` y `src/modules/mvz/dashboard`.

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
  - `exportaciones`
  - `pruebas`
  - `ranchos`
  - `usuarios`

## Estructura de carpetas esperada

### Modulo actor-owned o capability-owned

```text
src/modules/<owner>/<feature>/
  application/
    dto/
    use-cases/
  domain/
    entities/
    repositories/
    services/
  infra/
    api/
    http/
    mock/
    supabase/
    prisma/
  presentation/
    components/
    hooks/
  index.ts
```

No todos los subdirectorios son obligatorios, pero el significado si es estable:

- `application`: casos de uso y DTOs.
- `domain`: entidades, contratos y reglas puras.
- `infra/api`: adaptadores cliente o repositorios que consumen HTTP desde frontend.
- `infra/http`: handlers que atienden rutas de `src/app/api`.
- `infra/supabase`: repositorios server-side y queries directos a Supabase.
- `presentation`: componentes, hooks y contexto feature-owned.
- `index.ts`: superficie publica estable del modulo.

### Entry point HTTP esperado

```text
src/app/api/<...>/route.ts
```

Contenido esperado:

```ts
export { GET, POST } from "@/modules/<owner>/<feature>";
```

o reexport equivalente desde `infra/http` si el modulo aun no expone alias publicos.

## Como se debe trabajar a futuro

### 1. Elegir owner antes de codear

- Si la capacidad es exclusiva de admin, producer o MVZ, va en `src/modules/admin/*`, `src/modules/producer/*` o `src/modules/mvz/*`.
- Si la capacidad es compartida entre actores o es actor-neutral, va en `src/modules/<capability>`.
- Si el problema es transversal de auth, audit, db, tenant, middleware o infraestructura, va en `src/server/*`.

### 2. No meter negocio en entrypoints

- No agregues queries directas en `src/app/api`.
- No pongas reglas de negocio en paginas de `src/app`.
- Mantén `src/app` como capa de composicion y routing.

### 3. Ubicar cada pieza en su capa

- Caso de uso nuevo -> `application/use-cases`.
- Contrato o entidad -> `domain`.
- Handler HTTP -> `infra/http`.
- Repositorio server-side -> `infra/supabase`.
- Adaptador cliente que llama `/api/*` -> `infra/api`.
- Hook o componente feature-owned -> `presentation`.

### 4. Exponer surfaces publicas estables

- Si una pagina, hook o ruta consume el modulo desde afuera, agrega export en `index.ts`.
- Evita crear imports profundos nuevos cuando el modulo ya tiene una surface publica razonable.
- Si necesitas un reexport temporal, usalo como compatibilidad corta, no como destino final.

### 5. Documentar en el mismo cambio

- Si cambias ownership o estructura, actualiza este archivo.
- Si cambias familias HTTP o sus owners, actualiza `src/app/api/README.md`.
- Si el cambio afecta trazabilidad de documentacion, agrega nota en `docs/CHANGELOG.md`.

### 6. Validar siempre

- `npm run typecheck`
- `npm run lint`
- `npm run test:integration`

## Notas operativas

- Los directorios archivados documentados en `docs/architecture/archived-modules.md` no deben reaparecer en el arbol activo.
- Los duplicados locales como `src/shared/ui/* copy.tsx` no forman parte de la arquitectura activa.
- Los redirects legacy de MVZ siguen vigentes, pero su implementacion vive en `src/modules/ranchos/presentation/mvz/LegacyMvzRedirect.tsx`.
