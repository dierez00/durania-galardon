# Arquitectura

## Estructura principal

```text
src/
  app/
    (public)/
    (tenant)/
    api/
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

## Modulos implementados en transicion

- `usuarios`: con repositorio mock + use-cases (`listUsers`, `filterUsersUseCase`).
- `bovinos`: con repositorio mock + use-case (`listBovinos`).

## Modulos plantilla

Se crearon para expansion futura:

- `productores`, `ranchos`, `pruebas`, `cuarentenas`, `exportaciones`, `catalogos`
- `customers`, `loans`, `interests`, `billing`

## Rutas

- Login publico: `/`
- Panel tenant: `/dashboard`, `/usuarios`, `/bovinos`, etc.
- API base: `/api/health`, `/api/tenant/resolve`
