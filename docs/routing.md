# Rutas y guards

## Vista general

- Publico: `/` y `/login`
- Admin tenant: `/admin/*`
- Operacion tenant: `/producer/*` y `/mvz/*`

## Rutas por panel

- `tenant_admin`
  - `/admin`
  - `/admin/producers`
  - `/admin/mvz`
  - `/admin/quarantines`
  - `/admin/exports`
  - `/admin/normative`
  - `/admin/audit`
  - `/admin/appointments`
- `producer` y `employee`
  - `/producer/dashboard`
  - `/producer/ranchos`
  - `/producer/bovinos`
  - `/producer/movilizacion`
  - `/producer/exportaciones`
  - `/producer/documentos`
  - `/producer/empleados`
- `mvz_government` y `mvz_internal`
  - `/mvz/dashboard`
  - `/mvz/asignaciones`
  - `/mvz/pruebas`
  - `/mvz/exportaciones`

## Guards principales

- `src/app/(tenant)/layout.tsx`
  - valida sesion
  - resuelve rol tenant
  - restringe acceso a prefijos permitidos
  - valida permisos por ruta
- `src/app/(admin)/admin/(protected)/layout.tsx`
  - valida sesion
  - permite solo `tenant_admin`
  - redirige otros roles a su home correspondiente
