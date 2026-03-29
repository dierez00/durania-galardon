Status: Reference
Owner: Engineering
Last Updated: 2026-03-29
Source of Truth: Deep technical reference for the live `bovinos` module. System-wide architecture and data rules live in `docs/architecture/overview.md` and `docs/data/database.md`.

# Modulo Bovinos

Documentacion tecnica del modulo compartido `src/modules/bovinos`, usado por productor, MVZ y superficies admin que consumen detalle sanitario del animal.

## Resumen

El modulo `bovinos` concentra control sanitario, elegibilidad de exportacion y la ficha consolidada del animal:

- listado de animales con indicadores inline de TB, BR, salud, exportabilidad y collar activo
- perfil ampliado del animal (`name`, `breed`, `weight_kg`, `age_years`, `health_status`, `last_vaccine_at`)
- ficha detalle con pruebas, incidentes, genealogia, vacunaciones y exportaciones
- tabs adicionales de detalle para ubicacion actual e historial de actividad con mapa
- acciones rapidas contextuales por panel
- tab de collares en producer integrado dentro de la pantalla de animales
- mapa general de animales por UPP en producer con telemetria IoT
- consumo SQL-first desde `v_animals_sanitary`

Superficies activas:

- productor: `/producer/bovinos`, `/producer/projects/[uppId]/animales`, `/producer/projects/[uppId]/animales/[id]`
- MVZ: `/mvz/ranchos/[uppId]/animales`, `/mvz/ranchos/[uppId]/animales/[animalId]`
- admin: vistas de exportacion que reutilizan el detalle consolidado del animal

## Arquitectura

```text
src/modules/bovinos/
|-- domain/
|   |-- entities/
|   |-- repositories/
|   `-- services/
|-- application/
|   `-- use-cases/
|-- infra/
|   |-- api/
|   |-- http/
|   |-- mappers/
|   |-- mock/
|   `-- supabase/
`-- presentation/
    |-- hooks/
    |-- BovinoList.tsx
    |-- BovinoDetail.tsx
    |-- MvzBovinoDetail.tsx
    |-- BovinoDetailContent.tsx
    |-- ProducerBovinosPage.tsx
  |-- BovinosFilters.tsx
  |-- ProducerCollarsTab.tsx
  |-- ProducerCollarsFilters.tsx
  |-- ProducerBovinosMapSection.tsx
  |-- ProducerBovinosLeafletMap.tsx
  |-- BovinoLocationTab.tsx
  `-- BovinoActivityHistoryTab.tsx
```

Reglas de ownership:

- `src/modules/bovinos` conserva modelo, mapeo y UI compartida del animal
- `src/modules/ranchos/presentation/mvz/*` resuelve el contexto del rancho MVZ y reutiliza componentes compartidos
- `src/app/*` se mantiene como entrypoint delgado

## Dominio

### Entidad `Bovino`

```ts
interface BovinoSanitary {
  tb_date: string | null;
  tb_result: string | null;
  tb_valid_until: string | null;
  tb_status: string | null;
  br_date: string | null;
  br_result: string | null;
  br_valid_until: string | null;
  br_status: string | null;
  sanitary_alert: string | null;
}

interface Bovino {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  name: string | null;
  sex: "M" | "F";
  birth_date: string | null;
  breed: string | null;
  weight_kg: number | null;
  age_years: number | null;
  health_status: string | null;
  last_vaccine_at: string | null;
  status: string;
  mother_animal_id: string | null;
  current_collar_uuid: string | null;
  current_collar_id: string | null;
  current_collar_status: string | null;
  current_collar_linked_at: string | null;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  sanitary: BovinoSanitary;
  canExport: boolean;
}
```

### Reglas relevantes

- `canExport` se calcula con `checkExportability()`
- `health_status` usa `healthy`, `observation`, `quarantine`
- el collar activo del animal se representa con `current_collar_*`
- el matching de backfill no usa `name` como clave; el identificador canonico sigue siendo `siniiga_tag`

## Infraestructura

### Fuente principal

La vista `v_animals_sanitary` es el contrato SQL principal para listados y detalle agregado del animal.

Campos usados por el modulo:

- identidad: `animal_id`, `upp_id`, `siniiga_tag`
- perfil: `name`, `breed`, `weight_kg`, `age_years`, `sex`, `birth_date`
- salud: `health_status`, `last_vaccine_at`, `tb_*`, `br_*`, `sanitary_alert`
- contexto: `upp_name`, `upp_code`, `upp_status`, `animal_status`
- genealogia: `mother_animal_id`
- collar: `current_collar_uuid`, `current_collar_id`, `current_collar_status`, `current_collar_linked_at`

### Repositorios y mappers

- `ServerBovinoRepository.ts` resuelve lectura server-side desde Supabase
- `ApiBovinoRepository.ts` mantiene el cliente HTTP del flujo producer legacy
- `bovino.mapper.ts` traduce el record SQL/API al modelo de dominio y calcula `canExport`

## Rutas y contratos

### Producer

- `GET|POST /api/producer/bovinos`
- `GET /api/producer/bovinos/[id]`
- `GET /api/producer/bovinos/[id]/field-tests`
- `GET /api/producer/bovinos/[id]/incidents`
- `GET /api/producer/bovinos/[id]/vaccinations`
- `GET /api/producer/bovinos/[id]/exports`
- `GET /api/producer/bovinos/[id]/offspring`

`POST /api/producer/bovinos` ya acepta perfil ampliado:

- `name`
- `breed`
- `ageYears`
- `weightKg`
- `healthStatus`
- `lastVaccineAt`
- `motherAnimalId`

Rutas internas consumidas por las vistas de mapas/collares en producer:

- `GET /api/producer/collars`
- `POST /api/producer/collars/[collarId]/assign`
- `GET /api/producer/upp/[uppId]/collars/realtime`
- `GET /api/producer/upp/[uppId]/collars/history`
- `GET /api/producer/upp/[uppId]/collars/realtime/stream`
- `GET /api/producer/upp/[uppId]/collars/realtime-stream` (alias de compatibilidad)
- `GET /api/producer/collars/[collarId]/iot/history`
- `GET /api/producer/collars/[collarId]/iot/realtime/stream`

### MVZ

- `GET /api/mvz/ranchos/[uppId]/animales`
- `GET /api/mvz/ranchos/[uppId]/animales/[animalId]`

Las pantallas de vacunacion e incidencias del rancho aceptan navegacion con query params:

- `?action=nuevo`
- `?animalId=<uuid>`

Esto permite abrir formularios con el animal ya seleccionado desde la ficha detalle.

## Presentacion

### `BovinoList`

Tabla compartida para productor y MVZ.

Columnas activas:

- `Arete SINIIGA`
- `Perfil`
- `Sexo`
- `Rancho` solo cuando la vista no esta contextualizada por proyecto o rancho
- `Nacimiento`
- `Salud`
- `Collar`
- `TB`
- `BR`
- `Estado`
- `Exportable`
- `Acciones`

Notas UX:

- el nombre del animal es clickable y navega al mismo detalle que el boton de acciones
- `showUpp={false}` se usa en tabs contextuales de productor y MVZ para ocultar `Rancho`

### `BovinoDetailContent`

La ficha detalle muestra:

- encabezado con nombre o arete
- acciones rapidas por panel
- snapshot sanitario superior
- `DetailInfoGrid` con perfil, UPP, genealogia y collar
- tabs para pruebas, incidentes, genealogia, vacunaciones y exportaciones
- tabs para pruebas, incidentes, genealogia, vacunaciones, ubicacion, historial de actividad y exportaciones

Acciones rapidas por panel:

- MVZ: `Agregar vacuna`, `Agregar reporte`, `Ver reportes`
- productor: `Ver exportaciones`, `Abrir movilizaciones`, `Ver documentos`

### Productor

`ProducerBovinosPage.tsx` incluye:

- tabs de pagina `Animales` y `Collares`
- mapa general por UPP despues del titulo
- filtros
- lista contextual por UPP
- dialogo de alta de bovino con perfil ampliado

`ProducerCollarsTab.tsx` incluye:

- filtros por busqueda, estado, firmware y fecha de vinculacion
- acciones por fila con menu contextual (`Ver mas`, `Asignar vaca`)
- drawer de asignacion con tarjetas de bovinos elegibles por SINIIGA

`BovinoLocationTab.tsx` incluye:

- mapa de punto unico con ultima coordenada del bovino
- stream SSE por UPP con reconexion exponencial y fallback a snapshot
- estados de UX para stream (`Tiempo real`, `Conectando stream...`, `Modo respaldo`)

`BovinoActivityHistoryTab.tsx` incluye:

- filtro por fecha (`DateRangeFilter`) y por hora (`TimeRangeFilter`)
- mapa de trayecto historico con polyline y puntos
- limpieza de telemetria invalida `lat/lng = 0,0`

### MVZ

`MvzRanchAnimalsView.tsx` reutiliza `BovinoList` dentro del contexto del rancho.

`MvzBovinoDetail.tsx` reutiliza la misma ficha detalle y habilita acciones rapidas orientadas a vacunacion e incidencias.

## Flujo de datos

```text
Pantalla
  -> hook o use-case
    -> repository
      -> Supabase o API route
        -> v_animals_sanitary + tablas relacionadas
```

Detalle:

```text
BovinoDetail / MvzBovinoDetail
  -> useBovinoDetail / useMvzBovinoDetail
    -> ServerBovinoRepository
      -> animal base
      -> field_tests
      -> sanitary_incidents
      -> animal_vaccinations
      -> export_requests
      -> offspring
```

## Relacion con la migracion 010

La migracion `sql/migration_010_animals_backfill_and_collar_link.sql` extiende el contrato de datos que consume este modulo:

- nuevas columnas de perfil en `animals`
- snapshot de collar actual en `v_animals_sanitary`
- backfill controlado desde staging para perfil faltante y vinculacion canonica de collares

Para detalles SQL, restricciones e idempotencia del backfill, ver `docs/data/database.md`.
