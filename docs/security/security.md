# Seguridad actual del proyecto

Fecha de corte: 2026-03-03  
Estado: evaluacion tecnica basada en evidencia de codigo y SQL del repositorio.

## 1) Objetivo y alcance

Este documento describe controles de seguridad actualmente implementados y controles faltantes/parciales en:

- App Next.js (API + UI)
- Capa de autorizacion/autenticacion
- SQL de esquema/politicas RLS/vistas
- Manejo de secretos y configuracion
- Estado de confiabilidad tecnica (tests, typecheck, auditoria de dependencias)

Fuera de alcance:

- Infraestructura cloud externa (WAF, reglas CDN, configuracion TLS del borde, backups administrados)
- Configuracion operativa externa a este repositorio

## 2) Modelo de seguridad actual

### 2.1 Autenticacion

Implementado:

- Login via Supabase Auth con `signInWithPassword` en `src/app/api/auth/login/route.ts:33-41`.
- Uso de token `Bearer` para resolver contexto autenticado en `src/server/auth/index.ts:70-82`.
- Resolucion de usuario autenticado con `auth.getUser(accessToken)` en `src/server/auth/index.ts:363-395`.

Evidencia:

- `src/app/api/auth/login/route.ts:34-37`
- `src/server/auth/index.ts:70-82`
- `src/server/auth/index.ts:363-395`

### 2.2 Autorizacion (rol + permiso + scope UPP)

Implementado:

- Guard central `requireAuthorized` con validacion de roles, permisos y scope UPP:
  - `src/server/authz/index.ts:202-306`
- Permisos por tenant via RPC `auth_has_tenant_permission`:
  - `src/server/auth/permissions.ts:4-24`
  - SQL `sql/migration_001_duraniaMVP.sql:613-627`
- Scope UPP via RLS/RPC y fallback defensivo:
  - `src/server/authz/index.ts:47-120`
  - SQL `sql/migration_001_duraniaMVP.sql:630-658`

Evidencia:

- `src/server/authz/index.ts:238-291`
- `sql/migration_001_duraniaMVP.sql:630-658`

## 3) Aislamiento multi-tenant (no mezcla de tenants)

### 3.1 Resolucion de tenant por request

Implementado:

- Resolucion por subdominio, luego header `x-tenant-slug`, luego fallback local (`DEFAULT_TENANT_SLUG`) en entornos localhost:
  - `src/server/tenants/resolveTenant.ts:36-67`
- Middleware/proxy inyecta tenant resuelto en headers internos:
  - `src/server/middleware/tenant-context.ts:7-25`
  - `src/proxy.ts:4-10`
- Validacion de tenant activo por slug en backend:
  - `src/server/auth/index.ts:313-343`

### 3.2 Encapsulamiento por tenant/UPP/membership

Implementado:

- Contexto principal desde vistas `v_user_context` y `v_user_permissions`:
  - `src/server/auth/index.ts:232-310`
  - `sql/views.sql:15-64`
- Helpers SQL de seguridad:
  - `auth_in_tenant`, `auth_has_tenant_role`, `auth_has_tenant_permission`, `auth_has_upp_access`, `auth_mvz_assigned_to_upp`
  - `sql/migration_001_duraniaMVP.sql:585-658`

### 3.3 RLS y politicas

Implementado:

- RLS habilitado en tablas principales multitenant:
  - `sql/migration_001_duraniaMVP.sql:685-709`
  - `sql/migration_002_mvz_hierarchy.sql:139-142`
- Politicas por tipo de recurso/rol:
  - `sql/migration_001_duraniaMVP.sql:720-1169`
  - `sql/migration_002_mvz_hierarchy.sql:145-247`
- Vistas con `security_invoker`:
  - `sql/views.sql:15-17`, `46-48`, `72-74`

### 3.4 Rutas con cliente RLS vs rutas con `service_role`

Implementado:

- Cliente RLS con token de usuario:
  - `src/server/auth/supabase.ts:29-42`
- Cliente `service_role` para operaciones administrativas/provisioning:
  - `src/server/auth/supabase.ts:44-70`

Control compensatorio actual:

- En rutas sensibles con `service_role`, se usa `requireAuthorized` y filtros manuales (`tenant_id`, `owner_tenant_id`, `producer_id`, `upp_id`) antes de operar.
- Ejemplo:
  - `src/app/api/admin/producers/[id]/visits/route.ts:9-33`, `54-63`
  - `src/app/api/mvz/tests/route.ts:61-90`, `109-133`

Riesgo residual:

- Si un filtro manual se omite/regresa por error, `service_role` evita RLS y puede ampliar acceso.

## 4) Proteccion de datos

### 4.1 En transito

- El repositorio asume uso de Supabase + HTTP(s), pero no contiene configuracion de terminacion TLS/WAF.
- Seguridad en transito depende de despliegue.

### 4.2 En reposo y cifrado

- No hay cifrado app-layer propio para campos sensibles en este codigo.
- La proteccion en reposo depende de capacidades de Supabase/Postgres/Auth.

### 4.3 Integridad de documentos

Implementado:

- `file_hash` obligatorio en documentos:
  - `sql/migration_001_duraniaMVP.sql:228-235`
  - `sql/migration_002_mvz_hierarchy.sql:83-90`
- API exige `fileHash` para alta de documentos:
  - `src/app/api/producer/documents/route.ts:67-71`, `99-107`

### 4.4 Sesion/token en cliente

Implementado:

- Login retorna access/refresh token:
  - `src/app/api/auth/login/route.ts:79-84`
- Cliente persiste sesion con `supabase.auth.setSession(...)`:
  - `src/app/(public)/login/page.tsx:133-137`
- Browser client via `@supabase/ssr`:
  - `src/shared/lib/supabase-browser.ts:3-12`
- Logout actual: `supabase.auth.signOut()` en cliente + endpoint backend que solo confirma estado:
  - `src/shared/ui/layout/Topbar.tsx:103-106`
  - `src/app/api/auth/logout/route.ts:3-6`

## 5) Gestion de secretos y credenciales

Implementado:

- Variables requeridas en runtime:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DATABASE_URL_DIRECT`
  - `src/shared/config/index.ts:13-25`
- Separacion de secretos:
  - Publicos (`NEXT_PUBLIC_*`) en `publicEnv`
  - Privados via `getServerEnv()`
- `SUPABASE_SERVICE_ROLE_KEY` se consume desde codigo server:
  - `src/server/auth/supabase.ts:46-61`
  - `src/server/auth/provisioning/index.ts:37-48`
  - `src/app/api/admin/mvz/[id]/route.ts:15-23`
  - `src/app/api/admin/producers/[id]/route.ts:15-23`
- `.env*` ignorado por git:
  - `.gitignore:33-35`

## 6) Trazabilidad y auditoria

Implementado:

- Registro de eventos en `audit_logs`:
  - `src/server/audit/index.ts:26-39`
- Campos relevantes:
  - actor, tenant, rol, accion, recurso, payload, IP, user-agent.
- En autorizacion se registran intentos bloqueados (`fraud_attempt`):
  - `src/server/authz/index.ts:219-230`, `250-260`, `274-284`
- Politica SQL: lectura de `audit_logs` restringida a gobierno:
  - `sql/migration_001_duraniaMVP.sql:1157-1169`

Comportamiento actual:

- Audit logging fail-open (no bloquea flujo):
  - `src/server/audit/index.ts:40-42`

## 7) Confiabilidad y resiliencia

### 7.1 Patrones atomicos / rollback

Implementado:

- Lotes admin MVZ/producers obligan `options.atomic=true` y ejecutan rollback en errores:
  - `src/app/api/admin/mvz/batch/route.ts:284-285`, `340-355`
  - `src/app/api/admin/producers/batch/route.ts:290-291`, `346-360`

### 7.2 Idempotencia offline sync

Implementado:

- `field_test_sync_events` define unicidad por `(mvz_user_id, client_mutation_id)`:
  - `sql/migration_001_duraniaMVP.sql:294-303`
- Endpoint sync revisa evento previo por `clientMutationId` y evita reprocesar:
  - `src/app/api/mvz/tests/sync/route.ts:64-74`

### 7.3 Estado actual de calidad tecnica (fecha de corte 2026-03-03)

Comandos ejecutados:

```bash
npm test
npm run typecheck
npm audit --json
npm ls xlsx react-spreadsheet
```

Resultados:

- `npm test`: 14 suites totales, 13 pasan y 1 falla (`tests/unit/spreadsheetUtils.test.ts`) por modulo faltante `xlsx`.
- `npm run typecheck`: falla con errores activos, incluyendo:
  - `src/app/api/admin/producers/[id]/route.ts(172,36)` uso de `supabaseAdmin` antes de declaracion.
  - errores de tipado en `src/app/api/admin/producers/[id]/visits/route.ts`.
  - modulos no resueltos `xlsx` y `react-spreadsheet`.
- `npm audit --json`: 3 vulnerabilidades `high` (incluye `xlsx` directo, `hono`, `minimatch`).
- `npm ls xlsx react-spreadsheet`: arbol local reportado como vacio en este entorno (`-- (empty)`), indicando drift de instalacion/dependencias.

## 8) Controles faltantes o parciales

### 8.1 Rate limiting / anti-automatizacion

No implementado en API revisada:

- Busqueda repo sin coincidencias:
  - `NO_MATCH_RATE_LIMIT_OR_CAPTCHA`
- Afecta especialmente:
  - `POST /api/auth/login` (`src/app/api/auth/login/route.ts`)
  - `POST /api/public/appointments` (`src/app/api/public/appointments/route.ts`)

### 8.2 Validacion fuerte de payloads

Estado parcial:

- Predomina validacion manual por campos requeridos con `trim()` y checks basicos.
- No se encontro libreria de esquemas (zod/yup/joi/valibot):
  - `NO_MATCH_SCHEMA_VALIDATION_LIB`

### 8.3 Hardening de errores API

Estado parcial:

- Contrato permite `details` en respuesta:
  - `src/shared/lib/api-response.ts:8-34`
- Muchas rutas regresan `error.message` de proveedor/DB al cliente.

### 8.4 Hardening de sesion/cabeceras

Estado parcial/no evidenciado:

- Endpoint logout backend no revoca token en servidor:
  - `src/app/api/auth/logout/route.ts:3-6`
- No se detectaron politicas de headers de seguridad en codigo app:
  - `NO_MATCH_SECURITY_HEADERS`

## 9) Conclusion de postura actual

Fortalezas reales:

- Base multitenant con RLS extensa y vistas `security_invoker`.
- Guard de autorizacion central y auditoria de intentos no autorizados.
- Separacion de secretos publicos/privados y uso server-side de `service_role`.
- Patrones de rollback en provisionamiento batch e idempotencia offline.

Riesgo residual actual:

- Riesgo alto por combinacion de `service_role` + filtros manuales en rutas sensibles.
- Riesgo de privilegios no intencionales por fallback de rol/permisos por defecto.
- Exposicion de datos internos en errores API y contrasenas temporales en respuestas de alta.
- Ausencia de rate limiting/anti-bot en endpoints expuestos.
- Salud tecnica incompleta (typecheck/tests/dependencias) que incrementa probabilidad de regresiones de seguridad.
