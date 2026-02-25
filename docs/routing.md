# Rutas y guards

## Vista general

El enrutado funcional del sistema queda segmentado en tres areas:

- Publico: `/` y `/login`
- Admin tenant: `/admin/*`
- Operacion tenant: `/producer/*` y `/mvz/*`

## Rutas por rol

- `tenant_admin`
  - `/admin/panel`
  - `/admin/users`
  - `/admin/producers`
  - `/admin/mvz`
  - `/admin/upps`
  - `/admin/quarantines`
  - `/admin/exports`
  - `/admin/normative`
  - `/admin/audit`
  - `/admin/reports`
  - `/admin/settings`
- `producer` y `employee`
  - `/producer/dashboard`
  - `/producer/ranchos`
  - `/producer/bovinos`
  - `/producer/pruebas`
  - `/producer/movilizacion`
  - `/producer/exportaciones`
  - `/producer/notificaciones`
  - `/producer/perfil`
- `mvz_government` y `mvz_internal`
  - `/mvz/dashboard`
  - `/mvz/asignaciones`
  - `/mvz/bovinos`
  - `/mvz/pruebas`
  - `/mvz/cuarentenas`
  - `/mvz/exportaciones`
  - `/mvz/notificaciones`
  - `/mvz/perfil`

## Guards principales

- `src/app/(tenant)/layout.tsx`
  - valida sesion
  - resuelve rol tenant
  - restringe acceso a prefijo `/producer` o `/mvz`
  - valida permisos por ruta
- `src/app/(admin)/admin/(protected)/layout.tsx`
  - valida sesion
  - permite solo `tenant_admin`
  - redirige otros roles a su home correspondiente

## Nota tecnica de App Router

`(route groups)` en Next.js no forman parte de la URL.  
Por eso, para evitar colisiones, los segmentos funcionales deben existir como carpetas reales (`producer` y `mvz`) y no solo como grupos entre parentesis.
