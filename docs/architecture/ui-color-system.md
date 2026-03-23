Status: Canonical
Owner: Engineering
Last Updated: 2026-03-23
Source of Truth: Global UI color tokens, semantic tone mapping, and enforcement rules for frontend surfaces.
Review Cadence: Update when changing theme tokens, semantic tone helpers, shared UI primitives, or repo color guard rules.

# Sistema de color semantico

## Objetivo

Este proyecto usa un sistema de color semantico centralizado para evitar colores hardcodeados y mantener consistencia entre vistas publicas, dashboards, flujos mobile/web y estados operativos.

La capa canonica vive en estos archivos:

- `src/app/globals.css`
- `src/shared/ui/theme/color-tokens.ts`
- `src/shared/ui/theme/semantic-tones.ts`
- `scripts/check-ui-colors.mjs`

## Paleta base

La paleta de marca para tema `light` usa estos valores como base:

| Rol | Valor |
| --- | --- |
| Primary | `#065758` |
| Secondary | `#82c3c4` |
| Tertiary | `#bdc6a4` |
| Accent | `#c4b760` |
| Soft | `#a9d4d6` |
| Background | `#f9fafc` |
| Surface | `#fefeff` |
| Text | `#1a222f` |

Los estados operativos se separan de la marca:

| Estado | Foreground | Background |
| --- | --- | --- |
| Success | `#4ec4a0` | `#f0fdf4` |
| Warning | `#e8741b` | `#fdedd5` |
| Info | `#3f7fee` | `#daeaff` |
| Error | `#d14344` | `#fee2e1` |

Los temas `dark` y `classic-dark` no reescriben la semantica. Mantienen los mismos roles (`primary`, `success`, `warning`, etc.) con valores derivados accesibles.

## Capas del sistema

### 1. Tokens globales

`src/app/globals.css` define:

- tokens de marca: `--brand-primary`, `--brand-secondary`, `--brand-tertiary`, `--brand-accent`, `--brand-soft`
- tokens base: `--brand-background`, `--brand-surface`, `--brand-text`
- tokens semanticos: `--neutral`, `--highlight`, `--info`, `--success`, `--warning`, `--error`
- tokens de estado: `--state-disabled-*`, `--state-focus-ring`
- aliases consumidos por Tailwind/shadcn: `--primary`, `--secondary`, `--accent`, `--border`, `--input`, `--ring`, `--chart-*`, `--sidebar-*`

### 2. Lectura de tokens y fallbacks

`src/shared/ui/theme/color-tokens.ts` expone:

- `APP_THEME_KEYS`
- `APP_COLOR_TOKEN_VARS`
- `APP_COLOR_TOKEN_FALLBACKS`
- `colorTokenVar()`
- `readColorToken()`

Esta capa se usa cuando un componente necesita leer tokens en runtime, por ejemplo integraciones como Leaflet.

### 3. Tonos semanticos tipados

`src/shared/ui/theme/semantic-tones.ts` es la capa de consumo para UI React.

Tonos disponibles:

- `brand`
- `secondary`
- `accent`
- `neutral`
- `info`
- `success`
- `warning`
- `error`

Slots disponibles:

- `badge`
- `chip`
- `surface`
- `surfaceStrong`
- `icon`
- `text`
- `border`
- `ghost`
- `dot`

Helpers canonicos:

- `toneClass(tone, slot)`
- `toneToBadgeVariant`

## Reglas de uso

### Shared UI

Los componentes en `src/shared/ui/*` deben consumir solo tokens o variantes semanticas. No deben introducir:

- hex directos
- `rgb(...)` / `hsl(...)`
- clases Tailwind tipo `text-green-600`, `bg-blue-50`, `border-red-200`

### Feature modules

Los modulos feature-owned deben mapear estados de dominio a tonos semanticos, por ejemplo:

- estado aprobado -> `success`
- pendiente / por vencer -> `warning`
- bloqueado / rechazado -> `error`
- inactivo / liberado -> `neutral`
- comparativo / informativo -> `info`

La logica de dominio decide el tono; la capa visual decide la clase concreta via `toneClass()` o `toneToBadgeVariant`.

### Pantallas

Cada pantalla debe limitar su jerarquia visual a 2 o 3 colores principales de marca. Los colores de alerta no se usan como decoracion; solo expresan estado.

## Patrones canonicos

### Badges y chips

- `Badge` soporta variantes semanticas: `accent`, `neutral`, `info`, `success`, `warning`, `error`
- `FilterBadge` usa `tone` en lugar de `colorClass`
- helpers como `DetailHeader` y listas feature-owned deben convertir estados a `Badge` semanticos

### Botones e inputs

- `Button` define estados consistentes para `hover`, `active`, `disabled` y `focus`
- `Input`, `Textarea` y `Select` usan `border/input/ring` desde tokens globales
- `focus` debe caer en `primary` o `state-focus-ring`, no en colores locales del modulo

### Alerts y notificaciones

- `Alert` soporta `info`, `success`, `warning`, `error`
- toasts y dialogs deben usar superficies y texto semanticos, no fondos palette-specific por componente

### Charts, sidebar y mapa

- charts consumen `chart-*`
- shells consumen `sidebar-*`
- integraciones externas que necesiten colores runtime deben leer tokens desde `readColorToken()` o `var(--token)`

## Enforcement

El repo incluye el guard `npm run check:ui-colors`, implementado en `scripts/check-ui-colors.mjs`.

Este guard falla si encuentra en `src/`:

- colores raw (`#hex`, `rgb`, `hsl`)
- utilidades Tailwind de paleta (`bg-green-*`, `text-blue-*`, etc.)

Excepciones canonicas:

- `src/app/globals.css`
- `src/shared/ui/theme/color-tokens.ts`

## Flujo recomendado para cambios futuros

1. Agrega o ajusta tokens en `src/app/globals.css`.
2. Si hace falta lectura runtime, actualiza `src/shared/ui/theme/color-tokens.ts`.
3. Si el cambio es de consumo UI, agrega o reutiliza tonos en `src/shared/ui/theme/semantic-tones.ts`.
4. Refactoriza shared UI antes de tocar features.
5. En features, mapea estados de dominio a tonos semanticos.
6. Ejecuta `npm run check:ui-colors`, `npm run lint` y `npm run typecheck`.

## Alcance actual

El sistema ya cubre:

- paginas publicas y auth
- shared primitives
- dashboards admin, producer y MVZ
- badges de estado y filtros
- flujos de documentos
- exportaciones, cuarentenas y ranchos
- markers de mapa y notificaciones UI

Cuando se agregue una nueva superficie frontend, debe integrarse a esta capa en lugar de crear una paleta local.
