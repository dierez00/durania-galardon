# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/
      page.tsx               # landing publica
      login/page.tsx
    (admin)/
      admin/
        (protected)/
          layout.tsx
          panel/page.tsx
          users/page.tsx
    (tenant)/
      layout.tsx             # guardia de sesion/rol tenant
    api/
      auth/
        login/route.ts
        logout/route.ts
      admin/
        users/route.ts
        users/[id]/status/route.ts
  core/
    domain/
    application/
    infra/
  modules/
    <modulo>/
      domain/
      application/
      infra/
      presentation/
  shared/
    ui/
    hooks/
    lib/
    config/
  server/
    auth/
    db/
    middleware/
    tenants/
```

## Principios aplicados

- `domain`: entidades y contratos de repositorio.
- `application`: casos de uso y DTOs.
- `infra`: adaptadores (mock/prisma/mappers).
- `presentation`: componentes/paginas sin acceso directo a DB.
- `server/auth`: reglas de autenticacion, resolucion de rol unico y validacion de token bearer.

## Modulos implementados en transicion

- `usuarios`: con repositorio mock + use-cases (`listUsers`, `filterUsersUseCase`).
- `bovinos`: con repositorio mock + use-case (`listBovinos`).

## Modulos plantilla

Se crearon para expansion futura:

- `productores`, `ranchos`, `pruebas`, `cuarentenas`, `exportaciones`, `catalogos`
- `customers`, `loans`, `interests`, `billing`

## Rutas

- Landing publica: `/`
- Login unico: `/login`
- Admin protegido: `/admin/panel`, `/admin/users`
- Panel tenant: `/dashboard`, `/usuarios`, `/bovinos`, etc.
- API base y auth:
  - `GET /api/health`
  - `GET /api/tenant/resolve`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/:id/status`

## Reglas de acceso

- Cada usuario debe tener exactamente un rol (`admin`, `mvz`, `producer`).
- Redireccion por rol:
  - `admin` -> `/admin/panel`
  - `mvz` y `producer` -> `/dashboard`
- `admin` no navega en rutas tenant; se redirige al modulo admin.
