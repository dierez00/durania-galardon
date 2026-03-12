# Módulo Bovinos — Tenant/Producer

> Documentación técnica del módulo `bovinos` implementado bajo arquitectura hexagonal.  
> Ruta base del tenant: `/producer/bovinos`

---

## Índice

1. [Resumen](#resumen)
2. [Arquitectura](#arquitectura)
3. [Dominio](#dominio)
4. [Aplicación](#aplicacion)
5. [Infraestructura](#infraestructura)
6. [Rutas API](#rutas-api)
7. [Presentación](#presentacion)
8. [Páginas](#paginas)
9. [Flujo de datos](#flujo-de-datos)

---

## Resumen

El módulo `bovinos` cubre **Módulo 2 (Control Sanitario)** y **Módulo 3 (REEMO / elegibilidad de exportación)**:

- Listado de animales con indicadores inline de pruebas **TB** y **BR**.
- Indicador de **exportabilidad** (REEMO) por animal.
- Página de detalle en `/producer/bovinos/[id]` con 5 pestañas.
- Conexión real a la base de datos vía la vista `v_animals_sanitary`.
- Sin cambios en el schema de Prisma.

---

## Arquitectura

```
src/modules/bovinos/
├── domain/
│   ├── entities/
│   │   ├── Bovino.ts
│   │   ├── BovinoFieldTest.ts
│   │   ├── BovinoSanitaryIncident.ts
│   │   ├── BovinoVaccination.ts
│   │   └── BovinoExport.ts
│   ├── repositories/
│   │   └── BovinoRepository.ts          ← interfaz
│   └── services/
│       ├── checkExportability.ts
│       └── filterBovinos.ts
├── application/
│   └── use-cases/
│       ├── listBovinos.ts
│       └── getBovinoDetail.ts
├── infra/
│   ├── api/
│   │   └── bovinosApi.ts                ← HTTP client (fetch)
│   ├── mappers/
│   │   ├── bovino.mapper.ts
│   │   └── fieldTest.mapper.ts
│   ├── ApiBovinoRepository.ts           ← implementación
│   └── container.ts                     ← instancias singleton
└── presentation/
    ├── hooks/
    │   ├── useBovinos.ts
    │   └── useBovinoDetail.ts
    ├── BovinoList.tsx
    ├── BovinosFilters.tsx
    ├── BovinoDetail.tsx
    ├── SanitarioBadge.tsx
    ├── PruebaStatusBadge.tsx
    ├── ExportableCheckBadge.tsx
    └── index.ts
```

---

## Dominio

### `Bovino` — entidad principal

```ts
interface BovinoSanitary {
  tb_date: string | null;
  tb_result: string | null;       // "negative" | "positive"
  tb_valid_until: string | null;
  tb_status: string | null;       // "vigente" | "por_vencer" | "vencida" | "sin_prueba"
  br_date: string | null;
  br_result: string | null;
  br_valid_until: string | null;
  br_status: string | null;
  sanitary_alert: string | null;  // "ok" | "por_vencer" | "prueba_vencida" | "positivo" | "sin_pruebas"
}

interface Bovino {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  sex: "M" | "F";
  birth_date: string | null;
  status: string;                 // "active" | "inactive"
  mother_animal_id: string | null;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  sanitary: BovinoSanitary;
  canExport: boolean;             // derivado por checkExportability()
}
```

### `BovinosFiltersState`

```ts
interface BovinosFiltersState {
  search: string;
  sexo: string;        // "M" | "F" | ""
  sanitario: string;   // "ok" | "por_vencer" | "prueba_vencida" | "positivo" | "sin_pruebas" | ""
  exportable: string;  // "apto" | "no_apto" | ""
  fechaDesde: string;
  fechaHasta: string;
}
```

### Otras entidades

| Entidad | Tabla origen | Campos clave |
|---|---|---|
| `BovinoFieldTest` | `field_tests` JOIN `test_types`, `mvz_profiles` | `test_type_key`, `sample_date`, `result`, `valid_until`, `mvz_name` |
| `BovinoSanitaryIncident` | `sanitary_incidents` | `incident_type`, `severity`, `status`, `detected_at`, `resolved_at` |
| `BovinoVaccination` | `animal_vaccinations` | `vaccine_name`, `dose`, `applied_at`, `due_at` |
| `BovinoExport` | `export_requests` | `status`, `compliance_60_rule`, `tb_br_validated`, `blue_tag_assigned`, `monthly_bucket` |

### `BovinoRepository` — interfaz

```ts
interface BovinoRepository {
  list(): Promise<Bovino[]>;
  getById(id: string): Promise<Bovino | null>;
  listFieldTests(animalId: string): Promise<BovinoFieldTest[]>;
  listIncidents(animalId: string): Promise<BovinoSanitaryIncident[]>;
  listVaccinations(animalId: string): Promise<BovinoVaccination[]>;
  listExports(animalId: string): Promise<BovinoExport[]>;
  listOffspring(animalId: string): Promise<Bovino[]>;
}
```

### `checkExportability` — servicio de dominio

Reglas para que `canExport = true`:

1. `bovino.status === "active"`
2. `bovino.upp_status !== "quarantined"`
3. `sanitary.tb_status === "vigente"` AND `sanitary.tb_result === "negative"`
4. `sanitary.br_status === "vigente"` AND `sanitary.br_result === "negative"`

La función `exportabilityReason(bovino)` devuelve el primer motivo de bloqueo como cadena legible.

### `filterBovinos` — servicio de dominio

Filtrado en memoria que aplica `BovinosFiltersState` sobre el arreglo de `Bovino[]`. Soporta:
- búsqueda por `siniiga_tag`, `upp_name`, `upp_code`
- filtro por `sex`, `sanitary_alert`, `canExport`
- rango de fechas de nacimiento

---

## Aplicación

### `ListBovinos`

```ts
class ListBovinos {
  execute(filters?: Partial<BovinosFiltersState>): Promise<Bovino[]>
}
```

Llama a `repository.list()` y aplica `filterBovinos` si se pasan filtros.

### `GetBovinoDetail`

```ts
interface BovinoDetailResult {
  bovino: Bovino;
  fieldTests: BovinoFieldTest[];
  incidents: BovinoSanitaryIncident[];
  vaccinations: BovinoVaccination[];
  exports: BovinoExport[];
  offspring: Bovino[];
}

class GetBovinoDetail {
  execute(id: string): Promise<BovinoDetailResult | null>
}
```

Obtiene el bovino y sus 5 colecciones en paralelo (`Promise.all`).

---

## Infraestructura

### `bovinosApi.ts` — cliente HTTP

| Función | Endpoint |
|---|---|
| `apiFetchBovinos()` | `GET /api/producer/bovinos` |
| `apiFetchBovinoById(id)` | `GET /api/producer/bovinos/[id]` |
| `apiFetchFieldTests(id)` | `GET /api/producer/bovinos/[id]/field-tests` |
| `apiFetchIncidents(id)` | `GET /api/producer/bovinos/[id]/incidents` |
| `apiFetchVaccinations(id)` | `GET /api/producer/bovinos/[id]/vaccinations` |
| `apiFetchExports(id)` | `GET /api/producer/bovinos/[id]/exports` |
| `apiFetchOffspring(id)` | `GET /api/producer/bovinos/[id]/offspring` |

Todas las funciones añaden el header `Authorization: Bearer <token>` vía `getAccessToken()`.

### `bovino.mapper.ts`

Convierte el registro de la API (`BovinoApiRecord`) a la entidad de dominio `Bovino`, calculando `canExport` mediante `checkExportability()`.

### `fieldTest.mapper.ts`

Convierte `FieldTestApiRecord` a `BovinoFieldTest`.

### `ApiBovinoRepository` — implementación

Implementa `BovinoRepository` consumiendo el cliente HTTP y aplicando los mappers.

### `container.ts` — singleton

```ts
export const listBovinosUseCase   = new ListBovinos(new ApiBovinoRepository());
export const getBovinoDetailUseCase = new GetBovinoDetail(new ApiBovinoRepository());
```

---

## Rutas API

Todas las rutas están bajo `src/app/api/producer/bovinos/` y requieren:
- `requireAuthorized({ roles: ["producer","employee"], permissions: ["producer.bovinos.read"] })`
- Verificación de acceso al UPP vía `auth.context.canAccessUpp(uppId)`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/producer/bovinos` | Lista todos los animales del tenant desde `v_animals_sanitary` |
| `POST` | `/api/producer/bovinos` | Crea un nuevo animal en la tabla `animals` |
| `GET` | `/api/producer/bovinos/[id]` | Detalle de un bovino |
| `GET` | `/api/producer/bovinos/[id]/field-tests` | Pruebas TB/BR del animal |
| `GET` | `/api/producer/bovinos/[id]/incidents` | Incidentes sanitarios |
| `GET` | `/api/producer/bovinos/[id]/vaccinations` | Vacunaciones |
| `GET` | `/api/producer/bovinos/[id]/exports` | Solicitudes de exportación de la UPP |
| `GET` | `/api/producer/bovinos/[id]/offspring` | Crías (animales donde `mother_animal_id = id`) |

### Vista de base de datos usada

```
v_animals_sanitary
  animal_id, upp_id, tenant_id, siniiga_tag, sex, birth_date,
  animal_status, mother_animal_id, upp_name, upp_code,
  tb_date, tb_result, tb_valid_until, tb_status,
  br_date, br_result, br_valid_until, br_status,
  sanitary_alert
```

---

## Presentación

### Hooks

#### `useBovinos`

- `useState` para `bovinos`, `loading`, `error`, `filters`, `appliedFilters`
- Debounce de 400 ms para cambios solo de texto
- Llama `listBovinosUseCase.execute(appliedFilters)`

```ts
const { bovinos, loading, error, filters, onFiltersChange, reload } = useBovinos();
```

#### `useBovinoDetail`

- Carga bovino + todos los tabs en una sola llamada (`getBovinoDetailUseCase.execute(id)`)
- Gestiona `activeTab` para `DetailTabBar`

```ts
const {
  bovino, loading, error, activeTab, setActiveTab,
  fieldTests, incidents, vaccinations, exports, offspring
} = useBovinoDetail(id);
```

### Componentes de badge

| Componente | Propósito |
|---|---|
| `SanitarioBadge` | Color-badge genérico para cualquier estado (`active`, `vigente`, `positivo`, etc.) |
| `PruebaStatusBadge` | Icono + etiqueta para estado de prueba TB o BR individual |
| `ExportableCheckBadge` | ✓ verde / ✗ rojo con tooltip mostrando el motivo de bloqueo |

### `BovinoList`

Tabla con columnas: **Arete SINIIGA · Sexo · Rancho · Nacimiento · TB · BR · Estado · Exportable · Acciones**

El botón de ojo navega a `/producer/bovinos/[id]` vía `router.push`.

### `BovinosFilters`

Barra de filtros usando componentes de `@/shared/ui/filters/`:

| Control | Campo | Valores |
|---|---|---|
| `SearchBar` | `search` | texto libre |
| `FilterSelect` | `sexo` | `M` / `F` |
| `FilterSelect` | `sanitario` | `ok` / `por_vencer` / `prueba_vencida` / `positivo` / `sin_pruebas` |
| `FilterSelect` | `exportable` | `apto` / `no_apto` |
| `DateRangeFilter` | `fechaDesde` / `fechaHasta` | fechas de nacimiento |

### `BovinoDetail`

Usa los componentes compartidos de `@/shared/ui/detail/`:

```
DetailHeader      ← título = arete SINIIGA, backHref = /producer/bovinos
DetailInfoGrid    ← 8 campos en 3 columnas
Indicadores TB/BR + ExportableCheckBadge
DetailTabBar      ← 5 pestañas
  pruebas          → Table de field_tests
  incidentes       → Table de sanitary_incidents
  genealogia       → Table de crías
  vacunaciones     → Table de animal_vaccinations
  exportaciones    → Table de export_requests
```

Cada pestaña vacía muestra `DetailEmptyState` con un icono descriptivo.

---

## Páginas

### `/producer/bovinos` — `src/app/(tenant)/producer/bovinos/page.tsx`

- Usa `useBovinos()` + `BovinosFilters` + `BovinoList`
- Botón **"Alta de bovino"** abre un `Dialog` con formulario (UPP ID, arete, sexo, fecha nacimiento)
- El formulario llama `POST /api/producer/bovinos` y recarga la lista

### `/producer/bovinos/[id]` — `src/app/(tenant)/producer/bovinos/[id]/page.tsx`

```tsx
export default function ProducerBovinoDetailPage({ params }) {
  const { id } = use(params);
  return <BovinoDetail id={id} />;
}
```

---

## Flujo de datos

```
Página (page.tsx)
  └─ useBovinos() / useBovinoDetail(id)
       └─ listBovinosUseCase / getBovinoDetailUseCase   [container.ts]
            └─ ApiBovinoRepository
                 └─ bovinosApi.ts  ──►  /api/producer/bovinos/...
                                             └─ getSupabaseAdminClient()
                                                  └─ v_animals_sanitary / tablas relacionadas
```

El auth flow en cada request API:

```
requireAuthorized(request)
  → valida JWT → extrae tenantId, userId, roles, permissions
  → canAccessUpp(uppId) → verifica upp_access para el usuario
```
