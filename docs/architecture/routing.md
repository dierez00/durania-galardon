Status: Canonical
Owner: Engineering
Last Updated: 2026-03-22
Source of Truth: Active route map, legacy redirects, and guard expectations for the current application.

# Rutas y guards

## Vista general

- Publico: `/` y `/login`
- Admin tenant: `/admin/*`
- Operacion tenant:
  - Productor: `/producer/*`
  - MVZ: `/mvz/*`

## Rutas por panel

- `tenant_admin`
  - `/admin`
  - `/admin/producers`
  - `/admin/producers/new`
  - `/admin/mvz`
  - `/admin/mvz/new`
  - `/admin/quarantines`
  - `/admin/exports`
  - `/admin/normative`
  - `/admin/audit`
  - `/admin/appointments`

- `producer`, `employee` y `producer_viewer`
  - Organizacion
    - `/producer`
    - `/producer/metrics`
    - `/producer/profile`
    - `/producer/settings` con cualquier permiso de settings (`producer.tenant.*`, `producer.upp.*`, `producer.employees.*`, `producer.roles.*`)
  - Proyecto
    - `/producer/projects/[uppId]`
    - `/producer/projects/[uppId]/animales`
    - `/producer/projects/[uppId]/animales/[id]`
    - `/producer/projects/[uppId]/movilizacion`
    - `/producer/projects/[uppId]/exportaciones`
    - `/producer/projects/[uppId]/documentos`
    - `/producer/projects/[uppId]/details`
  - Compatibilidad
    - `/producer/dashboard`
    - `/producer/ranchos`
    - `/producer/ranchos/[uppId]`
    - `/producer/bovinos`
    - `/producer/movilizacion`
    - `/producer/exportaciones`
    - `/producer/documentos`
    - `/producer/empleados`

- `mvz_government` y `mvz_internal`
  - Organizacion
    - `/mvz`
    - `/mvz/metrics`
    - `/mvz/profile`
    - `/mvz/settings` con cualquier permiso de settings (`mvz.tenant.*`, `mvz.assignments.read`, `mvz.members.*`, `mvz.roles.*`) excepto `mvz_internal`
  - Proyecto
    - `/mvz/ranchos/[uppId]`
    - `/mvz/ranchos/[uppId]/animales`
    - `/mvz/ranchos/[uppId]/historial-clinico`
    - `/mvz/ranchos/[uppId]/vacunacion`
    - `/mvz/ranchos/[uppId]/incidencias`
    - `/mvz/ranchos/[uppId]/reportes`
    - `/mvz/ranchos/[uppId]/documentacion`
    - `/mvz/ranchos/[uppId]/visitas`
  - Compatibilidad
    - `/mvz/dashboard`
    - `/mvz/ranchos`
    - `/mvz/asignaciones`
    - `/mvz/pruebas`
    - `/mvz/exportaciones`

## Compatibilidad legacy

### Productor

Estas rutas se mantienen como shims y resuelven al proyecto activo cuando existe:

- `/producer/dashboard` -> `/producer/projects/[selectedUppId]`
- `/producer/bovinos` -> `/producer/projects/[selectedUppId]/animales`
- `/producer/movilizacion` -> `/producer/projects/[selectedUppId]/movilizacion`
- `/producer/exportaciones` -> `/producer/projects/[selectedUppId]/exportaciones`
- `/producer/documentos` -> `/producer/projects/[selectedUppId]/documentos`
- `/producer/ranchos` -> `/producer`
- `/producer/ranchos/[uppId]` -> `/producer/projects/[uppId]`
- `/producer/empleados` -> `/producer/settings`

Si no hay `selectedUppId` persistido, redirigen a `/producer`.

### MVZ

Estas rutas se mantienen, pero redirigen a la jerarquia nueva:

- `/mvz/asignaciones` -> `/mvz/ranchos/[selectedUppId]`
- `/mvz/pruebas` -> `/mvz/ranchos/[selectedUppId]/historial-clinico`
- `/mvz/exportaciones` -> `/mvz/ranchos/[selectedUppId]/reportes`
- `/mvz/dashboard` -> `/mvz/metrics`

Si no hay `selectedUppId` persistido, redirigen a `/mvz`.

Regla especial `mvz_internal`:

- si tiene una sola asignacion activa, `/mvz` redirige a `/mvz/ranchos/[uppId]`
- si tiene varias asignaciones, `/mvz` muestra una lista minima para elegir rancho
- `/mvz/settings`, `/mvz/metrics` y `/mvz/dashboard` se bloquean y redirigen a `/mvz`

## Shell tenant

`src/app/(tenant)/layout.tsx` monta un shell comun con dos modos:

- Organizacion: sidebar global por actor y breadcrumb compacto con `Inicio`.
- Proyecto: breadcrumb `Inicio > rancho/UPP actual` y cambio de contexto inline desde la topbar.

La composicion del shell vive en `src/modules/workspace/*` y `src/shared/ui/layout/*`.

Reglas activas del shell:

- El sidebar tenant ya no muestra el nombre `Durania` ni una card contextual del tenant/proyecto.
- El sidebar conserva solo icono, descriptor del panel (`Operacion Productor` o `Operacion MVZ`) y opciones habilitadas por permisos.
- La topbar ya no muestra `tenant.slug` como badge de entorno en paneles tenant.
- El `ProfileMenu` separa `Mi perfil` de `Configuracion del panel`.
- `Mi perfil` existe siempre para roles tenant (`/producer/profile`, `/mvz/profile`).
- `Configuracion del panel` aparece si el usuario tiene cualquier permiso de los tabs de settings del panel activo.
- El selector de proyecto/rancho ya no vive debajo del breadcrumb: en modo proyecto se renderiza inline dentro del breadcrumb.
- En productor, el patron visible es `Inicio > <UPP actual>`.
- En MVZ, el patron visible es `Inicio > <rancho actual>`.

## Guards principales

- `src/app/(tenant)/layout.tsx`
  - valida sesion
  - resuelve rol tenant
  - valida permisos por segmentos de ruta (`/producer/projects/[uppId]/animales`, `/mvz/ranchos/[uppId]/vacunacion`, etc.)
  - permite `/producer/profile` y `/mvz/profile` como rutas self-service sin exigir permisos de configuracion del panel
  - resuelve el home del panel segun permisos (`/producer`, `/producer/settings`, `/producer/profile`, `/mvz`, `/mvz/settings`, `/mvz/profile`)
  - permite `/producer/settings` con cualquier permiso de tabs producer
  - permite `/mvz/settings` con cualquier permiso de tabs MVZ salvo `mvz_internal`
  - bloquea `mvz_internal` en `/mvz/settings`, `/mvz/metrics` y `/mvz/dashboard`
- `src/server/authz/index.ts`
  - aplica `roles`, `permissions` y `scope.uppId`
  - bloquea acceso a proyectos no asignados o fuera del tenant

## Split perfil vs panel

- `Configuracion` en sidebar izquierdo queda reservada para datos del tenant/panel.
- `Mi perfil` concentra datos de cuenta (`auth.user_metadata.full_name`, `profiles.email`) y ficha de dominio del usuario cuando exista.
- `employee`, `producer_viewer` y roles custom pueden entrar a `Mi perfil`.
- El acceso a `settings` ya no depende de un `AppRole` fijo sino de permisos del tenant.
