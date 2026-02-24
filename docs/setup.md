# Setup y comandos

## Requisitos

- Node.js 20+
- npm

## Instalacion

```bash
npm install
```

## Variables de entorno

Define en `.env`:

- `DATABASE_URL`
- `DATABASE_URL_DIRECT`
- `DEFAULT_TENANT_SLUG` (opcional para local)

## Desarrollo

```bash
npm run dev
```

## Calidad

```bash
npm run lint
npm run typecheck
npm run test
```

## Build

```bash
npm run build
```
