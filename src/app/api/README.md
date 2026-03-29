# API endpoints

`src/app/api` conserva los contratos HTTP publicos y privados, pero sus archivos deben limitarse a reexportar handlers desde los modulos duenos.

## Regla de trabajo

- Cada `route.ts` debe ser un entrypoint delgado.
- La logica de negocio y los queries viven en `src/modules/*`.
- Si un helper es transversal de backend, va en `src/server/*`.
- Cuando agregues o muevas una familia API, actualiza este archivo y `docs/architecture/overview.md`.

## Ownership por capacidad

- `admin/producers` -> `src/modules/admin/productores`
- `admin/mvz` -> `src/modules/admin/mvz`
- `admin/profile` -> `src/modules/admin/profile`
- `admin/settings` -> `src/modules/admin/settings`
- `admin/roles` -> `src/modules/admin/settings`
- `admin/employees` -> `src/modules/admin/empleados`
- `auth/password/recovery` y `auth/invite-context` -> `src/modules/auth`
- `admin/appointments` y `public/appointments` -> `src/modules/admin/citas`
- `admin/audit` -> `src/modules/admin/auditoria`
- `producer/bovinos` -> `src/modules/bovinos`
- `producer/documents` y `producer/upp-documents` -> `src/modules/producer/documents`
- `producer/profile` -> `src/modules/producer/profile`
- `producer/settings` -> `src/modules/producer/settings`
- `producer/settings/ranchos` -> `src/modules/producer/settings`
- `producer/roles` -> `src/modules/producer/settings`
- `producer/employees/resend-invite` -> `src/modules/producer/empleados`
- `producer/upp` -> `src/modules/producer/ranchos`
- `mvz/assignments` -> `src/modules/ranchos`
- `mvz/members` -> `src/modules/mvz/members`
- `mvz/profile` -> `src/modules/mvz/profile`
- `mvz/settings` -> `src/modules/mvz/settings`
- `mvz/roles` -> `src/modules/mvz/settings`

## Patron esperado

```ts
export { GET, POST, PATCH } from "@/modules/<owner>/<feature>";
```

Si el modulo aun no expone alias desde `index.ts`, el reexport puede apuntar temporalmente a `infra/http/*Handlers`.

## Auth/Tenant

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password/recovery`
- `GET /api/auth/invite-context`
- `GET /api/tenant/resolve`

## Admin

- `GET /api/admin/dashboard`
- `GET|PATCH /api/admin/profile`
- `GET|PATCH /api/admin/settings`
- `GET|POST|PATCH /api/admin/employees`
- `POST /api/admin/employees/resend-invite`
- `GET|POST|PATCH|DELETE /api/admin/roles`
- `GET|POST|PATCH /api/admin/producers`
- `GET|PATCH /api/admin/producers/:id/documents`
- `POST /api/admin/producers/batch`
- `GET|POST|PATCH /api/admin/mvz`
- `POST /api/admin/mvz/batch`
- `GET|POST|PATCH /api/admin/quarantines`
- `GET|POST|PATCH /api/admin/exports`
- `DELETE /api/admin/exports/:id`
- `GET|POST|PATCH /api/admin/normative`
- `GET /api/admin/audit`
- `GET|PATCH /api/admin/appointments`
- `GET|PATCH /api/admin/appointments/:id`

Contrato operativo de `admin/dashboard`:
- `GET /api/admin/dashboard`: devuelve `kpis`, `charts.exportsByMonth`, `charts.appointmentsByStatus` y `appointmentsPreview` para el dashboard administrativo.

Contrato operativo de `admin/profile`:
- `GET /api/admin/profile`: devuelve `account` y `membership` para `tenant_admin`.
- `PATCH /api/admin/profile`: permite editar solo `displayName`.

Contrato operativo de `admin/settings`:
- `GET /api/admin/settings`: devuelve `organization` y `summary` operativo del panel admin.
- `PATCH /api/admin/settings`: permite editar solo `organizationName`.
- `admin/settings` respeta tabs visibles por permisos: `Resumen`, `Auditoria`, `Empleados`, `Roles`.

Contrato operativo de `admin/employees`:
- soporta altas por `email` + `roleId`, cambio de rol, suspension/reactivacion y reenvio de onboarding.
- excluye al usuario actual de acciones destructivas desde la UI.

Contrato operativo de `admin/roles`:
- reutiliza el motor de roles tenant para panel `admin`.
- `tenant_admin` permanece como el unico rol base reservado del tenant gobierno.

Contrato operativo de `admin/appointments`:
- `GET /api/admin/appointments`: listado de citas del tenant admin.
- `PATCH /api/admin/appointments`: actualiza estado por `id`.
- `GET /api/admin/appointments/:id`: detalle de una cita para la vista `Ver mas`.
- `PATCH /api/admin/appointments/:id`: actualiza estado desde la vista detalle.

Contrato operativo de `admin/producers/:id/documents`:
- `GET /api/admin/producers/:id/documents`: listado unificado de `producer_documents` y `upp_documents` del productor.
- `GET /api/admin/producers/:id/documents?view=detail&sourceType=producer|upp&documentId=...`: detalle con metadatos OCR para modal de revision.
- `GET /api/admin/producers/:id/documents?view=file&sourceType=producer|upp&documentId=...`: URL firmada para preview del archivo.
- `PATCH /api/admin/producers/:id/documents`: actualiza estado/comentarios/vigencia con reglas de revision (rechazo con comentario obligatorio y vencido con comentario automatico).

## Producer

- `GET /api/producer/dashboard`
- `GET /api/producer/upp`
- `GET|PATCH /api/producer/profile`
- `GET|PATCH /api/producer/settings`
- `GET /api/producer/settings/ranchos`
- `GET|POST|PATCH|DELETE /api/producer/roles`
- `GET|POST /api/producer/bovinos`
- `GET /api/producer/collars`
- `POST /api/producer/collars/:collarId/assign`
- `POST /api/producer/collars/:collarId/unassign`
- `GET|POST /api/producer/movements`
- `GET|POST /api/producer/exports`
- `GET|POST|PATCH /api/producer/documents`
- `GET|POST /api/producer/upp-documents`
- `GET|POST|PATCH /api/producer/employees`
- `POST /api/producer/employees/resend-invite`
- `GET /api/producer/upp/:uppId/collars/realtime`
- `GET /api/producer/upp/:uppId/collars/history`
- `GET /api/producer/upp/:uppId/collars/realtime/stream`
- `GET /api/producer/upp/:uppId/collars/realtime-stream` (alias de compatibilidad)
- `GET /api/producer/collars/:collarId/iot/history`
- `GET /api/producer/collars/:collarId/iot/realtime/stream`

Contrato operativo de `producer/dashboard`:
- `GET /api/producer/dashboard`: devuelve KPIs globales del tenant productor, acciones rapidas disponibles por permisos y series analiticas para charts.
- `GET /api/producer/dashboard?uppId=...`: devuelve el mismo contrato filtrado al rancho/UPP activo (cuando aplica contexto de proyecto).

Contrato operativo de `producer/employees`:
- soporta altas y ediciones de `employee`, `producer_viewer` y `mvz_internal`
- cuando el rol es `mvz_internal`, tambien espera `fullName`, `licenseNumber` y sincroniza ranchos a `mvz_upp_assignments`
- el usuario creado con rol `mvz_internal` entra por el panel `/mvz`, no por `/producer`

### Scope de proyecto productor

Cuando la UI esta en `/producer/projects/[uppId]/*`, estas APIs aceptan `?uppId=` y deben responder filtradas al proyecto activo:

- `GET /api/producer/bovinos`
- `GET /api/producer/movements`
- `GET /api/producer/exports`
- `GET /api/producer/upp-documents`

`/api/producer/settings` queda reservado para configuracion del tenant y tabs del panel; `/api/producer/settings/ranchos` agrega la matriz de UPPs y asignaciones. Los datos self-service del usuario viven en `/api/producer/profile`.

Politica de comentarios en documentos:
- Productor consume `comments` en modo solo lectura para feedback de rechazo y vigencia.
- Solo flujos de admin/gobierno pueden actualizar `comments`.

Contrato operativo de telemetria IoT para collares:
- rutas `producer/upp/:uppId/collars/*` validan acceso por UPP con `canAccessUpp` y permisos `producer.collars.read`
- rutas `producer/collars/:collarId/iot/*` exponen historico y stream SSE por collar para tabs de ubicacion e historial de actividad
- los entrypoints en `src/app/api` se mantienen delgados y delegan en `src/modules/collars/infra/http/external/producerIotHandlers.ts`

## MVZ

- `GET /api/mvz/dashboard`
- `GET /api/mvz/assignments`
- `GET|POST|PATCH /api/mvz/members`
- `GET|PATCH /api/mvz/profile`
- `GET|PATCH /api/mvz/settings`
- `GET|POST|PATCH|DELETE /api/mvz/roles`
- `GET|POST /api/mvz/tests`
- `POST /api/mvz/tests/sync`
- `GET|PATCH /api/mvz/exports`
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

`/api/mvz/settings` queda reservado para configuracion del tenant y resumen operativo. La ficha profesional del usuario vive en `/api/mvz/profile`.

Politica operativa actual MVZ:
- `GET|POST|PATCH /api/mvz/members` y `GET|POST|PATCH|DELETE /api/mvz/roles` se conservan por compatibilidad de routing y ownership, pero responden `403 FORBIDDEN`
- gobierno da de alta a `mvz_government`
- productor da de alta a `mvz_internal`

### Shell tenant

`GET /api/auth/me` alimenta el shell tenant y debe incluir `panelType`, `permissions`, `tenant.name`, `roleKey`, `roleName`, `isSystemRole` e `isMvzInternal` para renderizar el contexto organizacional correcto.

## Public

- `POST /api/public/appointments`
