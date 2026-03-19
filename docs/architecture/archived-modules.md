# Módulos archivados

Los siguientes módulos scaffold fueron retirados del código activo durante la refactorización estructural porque no tenían consumidores reales fuera de su propio árbol:

- `src/modules/billing`
- `src/modules/catalogos`
- `src/modules/customers`
- `src/modules/dashboard`
- `src/modules/interests`
- `src/modules/loans`

## Criterio usado

- Sin imports externos reales desde `src/app`, `src/server`, otros módulos o `tests`
- Implementación mayormente placeholder o scaffold
- Sin rutas públicas, handlers productivos ni superficie usada por el runtime actual

## Nota operativa

- El surface activo de esos módulos ya fue retirado del código versionado.
- Si algún directorio vacío sigue apareciendo localmente, debe tratarse como residuo de filesystem y no como capacidad activa del sistema.

## Cómo reintroducir una capacidad

- Crear un owner canónico nuevo en `src/modules/<actor>/<feature>` o `src/modules/<feature>`
- Exponer solo la superficie necesaria desde `index.ts`
- Agregar consumidores reales desde `src/app` o `src/app/api`
- Documentar el ownership en `docs/architecture/overview.md`
Status: Canonical
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Canonical list of module families intentionally removed from the active code tree.
