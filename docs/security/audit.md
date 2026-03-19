Status: Assessment
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Dated security assessment retained for prioritization history. Current security posture lives in `docs/security/security.md`.

# Auditoria de seguridad (priorizada)

Fecha de corte: 2026-03-03  
Alcance: estado actual del repositorio (app + SQL + dependencias).

## 1) Metodologia

Criterios:

- `Critical`: compromiso probable de datos o control de acceso con explotacion simple.
- `High`: riesgo alto de confidencialidad/integridad o bypass por error comun.
- `Medium`: debilidad relevante con precondiciones moderadas.
- `Low`: mejora de hardening/gobierno con impacto acotado.

Validacion de hallazgos:

- Evidencia directa en archivos/rutas SQL.
- Verificacion ejecutable con comandos (`npm test`, `npm run typecheck`, `npm audit --json`, `npm ls ...`) cuando aplica.

## 2) Matriz de hallazgos priorizada

| ID | Severidad | Evidencia | Escenario de riesgo | Impacto (C/I/D) | Recomendacion | Prioridad |
|---|---|---|---|---|---|---|
| SEC-001 | High | `src/server/auth/index.ts:98-106`, `196-200`, `291-293`; `src/shared/lib/auth.ts:138-144` | Si no existe rol explicito en DB, se asigna rol por defecto y, si faltan permisos, se inyectan permisos por defecto (`tenant_admin` incluye todos). Puede habilitar privilegios no previstos por configuracion incompleta. | C: Alto / I: Alto / D: Medio | Eliminar fallback permisivo en produccion. Requerir rol explicito y fallar cerrado (`ROLE_NOT_FOUND`). Mantener fallback solo bajo feature flag de bootstrap controlado. | P0 |
| SEC-002 | High | `src/server/auth/supabase.ts:44-70`; multiples rutas `src/app/api/**` usan `getSupabaseAdminClient`/`getSupabaseProvisioningClient` | En rutas con `service_role`, RLS queda bypasseado; cualquier omision/regresion de filtro manual puede mezclar datos entre tenants. | C: Alto / I: Alto / D: Medio | Reducir `service_role` al minimo, mover operaciones a cliente RLS o RPC `SECURITY DEFINER` acotadas por tenant/UPP. Agregar tests negativos cross-tenant por endpoint sensible. | P0 |
| SEC-003 | High | `src/app/api/admin/mvz/route.ts:201-206`; `src/app/api/admin/mvz/batch/route.ts:259-265`; `src/app/api/admin/producers/batch/route.ts:268-274` | Endpoints devuelven `temporaryPassword` en respuesta JSON. Riesgo de exposicion en logs, proxies, herramientas cliente y observabilidad. | C: Alto / I: Medio / D: Bajo | Sustituir por flujo de activacion/invitacion one-time. No retornar secretos transitorios en API. | P0 |
| SEC-004 | High | `src/app/api/auth/login/route.ts`; `src/app/api/public/appointments/route.ts`; evidencia repo: `NO_MATCH_RATE_LIMIT_OR_CAPTCHA` | Fuerza bruta, credential stuffing y automatizacion sobre login y endpoint publico de citas. | C: Alto / I: Medio / D: Alto | Implementar rate limiting por IP + huella + tenant, anti-bot (captcha/turnstile) y politicas de bloqueo progresivo. Exponer headers de rate-limit. | P0 |
| SEC-005 | Medium | `src/app/api/mvz/tests/route.ts:119-125`; `src/app/api/mvz/tests/sync/route.ts:100-106` | Falta validacion contractual explicita `animal_id` pertenece a `upp_id` antes de insertar pruebas. Puede introducir inconsistencia de datos y errores de trazabilidad. | C: Medio / I: Alto / D: Bajo | Validar `animal_id` vs `upp_id` en API o constraint DB (FK compuesta o trigger). Responder error tipado `ANIMAL_UPP_MISMATCH`. | P1 |
| SEC-006 | Medium | `src/shared/lib/api-response.ts:8-34`; multiples rutas retornan `*.error.message` | Mensajes internos de proveedor/DB se propagan al cliente; aumenta fuga de estructura interna y facilita enumeracion. | C: Medio / I: Bajo / D: Bajo | Estandarizar contrato `code/message` publico y mover detalle interno a `traceId` + logs internos. | P1 |
| SEC-007 | Medium | `src/app/api/auth/logout/route.ts:3-6`; `src/shared/ui/layout/Topbar.tsx:103-106` | Endpoint logout backend no revoca sesion/refresh token; depende de `signOut` del cliente. Riesgo de contrato ambiguo e implementaciones parciales. | C: Medio / I: Medio / D: Bajo | Definir contrato unico: revocacion backend real o eliminar endpoint redundante y documentar flujo oficial. | P1 |
| SEC-008 | Medium | `src/app/api/admin/producers/[id]/route.ts(172,36)` error TS2448/TS2454; `npm run typecheck` | Defecto activo de compilacion en ruta administrativa critica; incrementa riesgo de fallas al desplegar/corregir seguridad. | C: Bajo / I: Medio / D: Medio | Corregir orden de declaracion y bloquear merge con `typecheck` obligatorio en CI. | P1 |
| SEC-009 | Medium | `npm test` falla en `tests/unit/spreadsheetUtils.test.ts`; `npm ls xlsx react-spreadsheet` retorna `-- (empty)` | Drift de entorno/dependencias: modulos referenciados no disponibles localmente; reduce confiabilidad de validacion previa a release. | C: Bajo / I: Medio / D: Alto | Corregir lock/install reproducible, validar `npm ci` limpio en CI y smoke build/test obligatorios. | P1 |
| SEC-010 | Medium | `npm audit --json` (3 high): `xlsx` directo, `hono`, `minimatch` | Dependencias con CVE high pueden abrir superficie explotable directa o transitiva. | C: Medio / I: Medio / D: Medio | Plan de upgrade/remediacion: actualizar arbol, evaluar reemplazo de `xlsx` si no hay fix oficial suficiente. Agregar escaneo SCA continuo. | P1 |
| SEC-011 | Low | evidencia repo: `NO_MATCH_SECURITY_HEADERS` | No hay evidencia de CSP/HSTS/XFO/XCTO/Referrer-Policy en capa app. Hardening incompleto (depende de infraestructura). | C: Medio / I: Bajo / D: Bajo | Definir baseline de headers de seguridad en edge/proxy y validarlo en pruebas de contrato. | P2 |

## 3) Evidencia de ejecucion (estado actual)

### 3.1 Pruebas

- `npm test`: 14 suites, 13 pasan, 1 falla.
- Falla: `tests/unit/spreadsheetUtils.test.ts` por `Cannot find package 'xlsx'`.

### 3.2 Typecheck

- `npm run typecheck`: falla.
- Incluye error activo: `src/app/api/admin/producers/[id]/route.ts(172,36)` uso de `supabaseAdmin` antes de declaracion.
- Incluye errores por modulos no resueltos (`xlsx`, `react-spreadsheet`) y tipado adicional.

### 3.3 Dependencias

- `npm audit --json`: `high=3`, `critical=0`.
- Hallazgos principales: `xlsx` (directo), `hono`, `minimatch`.

## 4) Plan de mejora por fases

### Fase P0 (inmediata)

Objetivo: cerrar riesgos de mayor impacto en control de acceso y exposicion de secretos.

Acciones:

1. Eliminar fallback de permisos/rol por defecto en runtime normal (`SEC-001`).
2. Retirar `temporaryPassword` de respuestas de APIs de alta (`SEC-003`).
3. Implementar rate limiting + anti-bot en login y citas publicas (`SEC-004`).
4. Revisar endpoints `service_role` y cubrir con tests cross-tenant negativos (`SEC-002`).

Criterios de cierre:

- No existe respuesta API que exponga credenciales temporales.
- Endpoints sensibles rechazan abuso automatizado con limites verificables.
- Pruebas de regresion demuestran aislamiento tenant en rutas con `service_role`.

### Fase P1 (endurecimiento)

Objetivo: robustecer consistencia, errores y confiabilidad operacional.

Acciones:

1. Validacion `animal_id`/`upp_id` + error tipado (`SEC-005`).
2. Contrato de errores con `traceId` y sin mensajes internos (`SEC-006`).
3. Corregir contrato de logout backend (`SEC-007`).
4. Cerrar deuda tecnica activa de typecheck/build/deps (`SEC-008`, `SEC-009`, `SEC-010`).

Criterios de cierre:

- `npm run typecheck` y `npm test` en verde en CI.
- Error API estable (`code/message`) sin `details` internos en produccion.

### Fase P2 (arquitectura y gobierno)

Objetivo: disminuir riesgo sistemico por diseno.

Acciones:

1. Migrar operaciones sensibles de `service_role` a RLS/RPC acotadas.
2. Baseline formal de headers de seguridad y verificacion automatizada.
3. Politica SCA continua con umbral de severidad para bloquear release.

Criterios de cierre:

- Superficie `service_role` minimizada y auditada.
- Security gates de pipeline documentados y forzados.

## 5) Backlog ejecutable

| Tarea | Dueno sugerido | Esfuerzo | Criterio de aceptacion |
|---|---|---|---|
| Remover fallback de permisos por defecto | Backend | M | Solicitudes sin rol explicito fallan con `ROLE_NOT_FOUND` en entorno productivo |
| Sustituir `temporaryPassword` por invitacion one-time | Backend + Producto | M | APIs de alta solo retornan `invitationId`/estado, nunca password |
| Rate limit + captcha en login/citas | Backend + DevOps | M | Respuestas con headers de limite y bloqueo bajo trafico automatizado |
| Validar `animal_id` pertenece a `upp_id` | Backend + DBA | S | Insert de prueba con mismatch responde `ANIMAL_UPP_MISMATCH` |
| Endurecer contrato de errores API | Backend | S | Sin mensajes internos en respuestas; trazabilidad via `traceId` |
| Corregir `supabaseAdmin` before declaration | Backend | XS | `tsc --noEmit` sin ese error |
| Normalizar instalacion de dependencias | DevOps + Frontend | S | `npm ci && npm test && npm run typecheck` en verde en CI limpio |
| Remediar CVE high (`xlsx`/tree) | DevSecOps + Frontend | M | `npm audit` sin high/critical aceptados por politica |
| Baseline headers de seguridad | DevOps | S | CSP/HSTS/XFO/XCTO/Referrer-Policy verificables en entorno objetivo |

## 6) Cambios propuestos de contratos API (no implementados en esta tarea)

1. `POST /api/auth/logout`
   - Definir revocacion backend real de refresh token/sesion o eliminar endpoint redundante.
2. Endpoints de alta (`/api/admin/*/batch`, `/api/admin/mvz`)
   - No retornar `temporaryPassword`; usar `invitationId` + activacion one-time.
3. Endpoints MVZ tests/sync
   - Regla contractual explicita `animal_id` debe pertenecer a `upp_id`; error `ANIMAL_UPP_MISMATCH`.
4. Contrato de errores API
   - Mantener `code/message` estable; mover detalle interno a `traceId` + logging interno.
5. Contrato de proteccion de abuso
   - Incluir headers de rate limit en endpoints sensibles.

## 7) Resumen ejecutivo

Postura actual: base de seguridad solida en multitenancy (RLS + authz central + auditoria), pero con riesgos altos operativos por fallback permisivo, uso amplio de `service_role` y exposicion de credenciales temporales.  
Prioridad inmediata: cerrar `P0` antes de ampliar funcionalidad.
