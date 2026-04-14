Status: Canonical
Owner: Engineering
Last Updated: 2026-04-14
Source of Truth: Canonical database reference for schema, IAM tables, views, RLS helpers, MVZ hierarchy additions, and IoT telemetry tables.
# DURANIA MVP PRO â€” DocumentaciÃ³n de Base de Datos

> **Stack:** Supabase / PostgreSQL Â· **VersiÃ³n:** v6  
> Referencia tÃ©cnica para desarrolladores del proyecto.


---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Tablas](#2-tablas)
   - [2.1 Identidad](#21-identidad)
   - [2.2 IAM por Tenant](#22-iam-por-tenant)
   - [2.3 Productores y UPPs](#23-productores-y-upps)
   - [2.4 MVZ Global](#24-mvz-global)
   - [2.5 Documentos](#25-documentos)
   - [2.6 Animales](#26-animales)
   - [2.7 Pruebas Sanitarias](#27-pruebas-sanitarias)
   - [2.8 MÃ³dulos Operativos](#28-mÃ³dulos-operativos)
   - [2.9 CRM y Notificaciones](#29-crm-y-notificaciones)
  - [2.10 IoT y TelemetrÃ­a](#210-iot-y-telemetria)
3. [Ãndices](#3-Ã­ndices)
4. [Vistas](#4-vistas)
5. [Funciones Helper RLS](#5-funciones-helper-rls)
6. [Operaciones Frecuentes](#6-operaciones-frecuentes)
7. [Resumen de Accesos RLS](#7-resumen-de-accesos-rls)
8. [Actualizacion v6 (MVZ Jerarquico)](#8-actualizacion-v6-mvz-jerarquico)
9. [Actualizacion v7 (IoT Telemetria)](#9-actualizacion-v7-iot-telemetria)

---

## 1. Arquitectura General

La base de datos estÃ¡ diseÃ±ada sobre un modelo **multi-tenant con tres tipos de entorno**. Cada entorno corresponde a un panel de usuario en la aplicaciÃ³n y define quÃ© datos puede ver y manipular cada usuario autenticado.

### Tipos de Tenant

| Tipo | Panel | DescripciÃ³n | Instancias |
|---|---|---|---|
| `government` | Panel Administrador | Gobierno del estado. Gestiona productores, MVZ, ranchos y normativa. | 1 (global) |
| `producer` | Panel Productor | Un tenant por cada productor. Contiene sus ranchos (UPPs), animales, equipo operativo y MVZ interno. | N (uno por productor) |
| `mvz` | Panel MVZ | Un tenant por cada MVZ externo. Accede a ranchos asignados para auditorÃ­as. | N (uno por MVZ) |

### Modelo de Roles por Tipo de Tenant

| Tenant | `role_key` | DescripciÃ³n |
|---|---|---|
| `government` | `tenant_admin` | Acceso total al panel de gobierno |
| `producer` | `tenant_admin` | Administrador del rancho (mismo acceso que `producer`) |
| `producer` | `producer` | DueÃ±o del rancho, acceso completo a sus UPPs |
| `producer` | `employee` | Empleado operativo del rancho |
| `producer` | `producer_viewer` | Usuario de consulta en panel productor |
| `mvz` | `tenant_admin` | Administrador del perfil MVZ |
| `mvz` | `mvz_government` | Auditor externo, accede a ranchos asignados por gobierno |
| `producer` | `mvz_internal` | Veterinario interno del productor. Se da de alta desde productor pero opera en el panel MVZ |
| `mvz` | `mvz_internal` | Miembro interno del tenant MVZ con acceso operativo sin administrar settings |

### Cadena de Acceso IAM

```
auth.users (Supabase Auth)
    â†“
profiles                  â† extensiÃ³n pÃºblica de auth.users
    â†“
tenant_memberships        â† el usuario pertenece a un tenant
    â†“
tenant_user_roles         â† se le asigna un rol dentro del tenant
    â†“
tenant_roles              â† tenant_admin | producer | employee | producer_viewer | mvz_*
    â†“
tenant_role_permissions   â† cada rol tiene permisos atÃ³micos
    â†“
permissions               â† admin.* | mvz.* | producer.*
```

### Flujo de Login y Routing

Base SQL de referencia:

Al autenticar un usuario, llamar `auth_get_panel_type()` para saber a quÃ© panel redirigir:

```sql
SELECT public.auth_get_panel_type();
-- 'government' â†’ /admin
-- 'producer'   â†’ /producer
-- 'mvz'        â†’ /mvz
```

---

Regla de aplicacion actual:

- El backend ya no depende solo de `auth_get_panel_type()`.
- Si `tenant.type = 'producer'` y el rol principal es `mvz_internal`, el panel efectivo se resuelve como `/mvz`.

## 2. Tablas

### 2.1 Identidad

#### `profiles`

Extiende `auth.users` de Supabase con metadatos de la aplicaciÃ³n. **Se crea automÃ¡ticamente** vÃ­a trigger al registrar un usuario en Supabase Auth. Toda FK de la app apunta a `profiles(id)`, nunca directamente a `auth.users`.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK Â· FK â†’ `auth.users(id)` |
| `email` | `TEXT` | Espejo denormalizado de `auth.users.email` para queries de aplicaciÃ³n |
| `status` | `TEXT` | `'active'` \| `'inactive'` \| `'blocked'` |
| `created_at` | `TIMESTAMPTZ` | Fecha de creaciÃ³n |

> âš ï¸ Los triggers `on_auth_user_created` y `on_auth_user_updated` mantienen `profiles.email` sincronizado con Supabase Auth. No insertar manualmente.

---

#### `tenants`

Representa un entorno aislado de datos. El campo `type` determina el panel y las polÃ­ticas RLS que aplican.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `type` | `TEXT` | `'government'` \| `'producer'` \| `'mvz'` |
| `slug` | `TEXT` | Identificador Ãºnico legible. Ej: `gobierno-durango` |
| `name` | `TEXT` | Nombre del tenant |
| `status` | `TEXT` | `'active'` \| `'inactive'` \| `'blocked'` |
| `created_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `created_at` | `TIMESTAMPTZ` | â€” |

---

### 2.2 IAM por Tenant

El sistema de permisos estÃ¡ **completamente basado en tenant**. No existen roles globales.

#### `permissions`

CatÃ¡logo global de permisos atÃ³micos. Compartidos por todos los tenants. Formato: `modulo.recurso.accion`.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `key` | `TEXT` | Unique. Ej: `'admin.producers.write'`, `'mvz.tests.sync'` |
| `description` | `TEXT` | DescripciÃ³n legible |
| `module` | `TEXT` | `'admin'` \| `'mvz'` \| `'producer'` |

<details>
<summary>Ver lista completa de permisos</summary>

**MÃ³dulo `admin`**
- `admin.dashboard.read` â€” Ver dashboard estatal
- `admin.users.read` / `.create` / `.update` / `.delete` / `.roles`
- `admin.tenant.read` / `.write`
- `admin.employees.read` / `.write`
- `admin.roles.read` / `.write`
- `admin.producers.read` / `.write`
- `admin.mvz.read` / `.write`
- `admin.upps.read` / `.write`
- `admin.quarantines.read` / `.write`
- `admin.exports.read` / `.write`
- `admin.normative.read` / `.write`
- `admin.audit.read`
- `admin.reports.export`
- `admin.appointments.read` / `.write`

**MÃ³dulo `mvz`**
- `mvz.dashboard.read`
- `mvz.assignments.read`
- `mvz.bovinos.read`
- `mvz.tests.read` / `.write` / `.sync`
- `mvz.quarantines.read` / `.write`
- `mvz.exports.read` / `.write`
- `mvz.notifications.read`
- `mvz.tenant.read` / `.write`
- `mvz.profile.read` / `.write`
- `mvz.members.read` / `.write`
- `mvz.roles.read` / `.write`
- `mvz.ranch.read`
- `mvz.ranch.animals.read`
- `mvz.ranch.clinical.read`
- `mvz.ranch.vaccinations.read` / `.write`
- `mvz.ranch.incidents.read` / `.write`
- `mvz.ranch.reports.read`
- `mvz.ranch.documents.read` / `.write`
- `mvz.ranch.visits.read` / `.write`

**MÃ³dulo `producer`**
- `producer.dashboard.read`
- `producer.tenant.read` / `.write`
- `producer.upp.read` / `.write`
- `producer.bovinos.read` / `.write`
- `producer.movements.read` / `.write`
- `producer.exports.read` / `.write`
- `producer.documents.read` / `.write`
- `producer.notifications.read`
- `producer.profile.read` / `.write`
- `producer.employees.read` / `.write`
- `producer.roles.read` / `.write`

</details>

---

#### `tenant_memberships`

Vincula un usuario a un tenant. Un usuario puede tener membresÃ­as en mÃºltiples tenants.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` |
| `user_id` | `UUID` | FK â†’ `profiles(id)` |
| `status` | `TEXT` | `'active'` \| `'inactive'` \| `'suspended'` |
| `invited_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `joined_at` | `TIMESTAMPTZ` | â€” |

**Constraint:** `UNIQUE(tenant_id, user_id)`

---

#### `tenant_roles`

Roles disponibles dentro de un tenant. Los roles de sistema (`is_system = true`) se crean con el seed de roles y permanecen reservados por tipo de panel.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` |
| `key` | `TEXT` | `tenant_admin` \| `producer` \| `employee` \| `producer_viewer` \| `mvz_internal` \| `mvz_government` \| `custom_<slug>` |
| `name` | `TEXT` | Nombre legible |
| `is_system` | `BOOLEAN` | `TRUE` si fue creado por el seed y corresponde a un rol base visible del panel |
| `priority` | `INTEGER` | Orden de prioridad (menor = mÃ¡s privilegio) |

**Constraint:** `UNIQUE(tenant_id, key)`

Reglas operativas actuales:

- `government` reserva `tenant_admin`.
- `producer` reserva `producer`, `employee`, `mvz_internal` y `producer_viewer`.
- `mvz` reserva `mvz_government` y `mvz_internal`.
- Los roles base visibles y los roles custom pueden editarse desde la UI de settings.
- La eliminacion de un rol base o custom se permite solo si no tiene filas activas en `tenant_user_roles`; si sigue asignado a miembros, la operacion debe bloquearse.
- Los roles custom usan `is_system = false` y la `key` interna sigue el patron `custom_<slug>`.
- Si el rol es `mvz_internal` dentro de un tenant `producer`, el panel activo se resuelve como MVZ y no como productor.

---

#### `tenant_role_permissions`

Asigna permisos atÃ³micos a un rol.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `tenant_role_id` | `UUID` | FK â†’ `tenant_roles(id)` Â· PK compuesta |
| `permission_id` | `UUID` | FK â†’ `permissions(id)` Â· PK compuesta |
| `granted_at` | `TIMESTAMPTZ` | â€” |

---

#### `tenant_user_roles`

Asigna roles a un miembro. Un usuario puede tener mÃºltiples roles en el mismo tenant.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `membership_id` | `UUID` | FK â†’ `tenant_memberships(id)` Â· PK compuesta |
| `tenant_role_id` | `UUID` | FK â†’ `tenant_roles(id)` Â· PK compuesta |
| `assigned_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `assigned_at` | `TIMESTAMPTZ` | â€” |

---

### 2.3 Productores y UPPs

#### `producers`

Datos personales del productor. Cada productor tiene un tenant propio (`owner_tenant_id`) donde viven sus ranchos y empleados.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `owner_tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant propio del productor (`type = 'producer'`) |
| `user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable (puede no tener cuenta aÃºn) |
| `curp` | `TEXT` | Unique Â· Nullable |
| `full_name` | `TEXT` | â€” |
| `status` | `TEXT` | `'active'` \| `'inactive'` |
| `created_at` | `TIMESTAMPTZ` | â€” |

> âš ï¸ RelaciÃ³n `owner_tenant_id` es 1:1. Solo puede existir un productor por tenant de tipo `producer` (Ã­ndice Ãºnico `producers_owner_tenant_unique`).

---

#### `upps`

Unidades de ProducciÃ³n Pecuaria (ranchos). Pertenecen al tenant del productor. El gobierno puede crearlos pero viven en el tenant del productor.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Siempre el tenant del productor |
| `producer_id` | `UUID` | FK â†’ `producers(id)` |
| `upp_code` | `TEXT` | CÃ³digo oficial. Unique Â· Nullable |
| `name` | `TEXT` | Nombre del rancho |
| `address_text` | `TEXT` | DirecciÃ³n en texto libre |
| `location_lat` | `NUMERIC` | Latitud GPS |
| `location_lng` | `NUMERIC` | Longitud GPS |
| `hectares_total` | `NUMERIC` | Superficie en hectÃ¡reas Â· Nullable |
| `herd_limit` | `INTEGER` | LÃ­mite mÃ¡ximo de cabezas Â· Nullable |
| `status` | `TEXT` | `'active'` \| `'quarantined'` \| `'suspended'` |
| `created_at` | `TIMESTAMPTZ` | â€” |

---

#### `user_upp_access`

Acceso granular de empleados y `mvz_internal` a UPPs especÃ­ficas dentro del tenant del productor.

Para `mvz_internal`, esta tabla tambien funciona como origen de sincronizacion hacia `mvz_upp_assignments` para poblar el panel MVZ con los ranchos asignados.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` |
| `user_id` | `UUID` | FK â†’ `profiles(id)` |
| `upp_id` | `UUID` | FK â†’ `upps(id)` |
| `access_level` | `TEXT` | `'owner'` \| `'editor'` \| `'viewer'` |
| `status` | `TEXT` | `'active'` \| `'inactive'` |
| `granted_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `granted_at` | `TIMESTAMPTZ` | â€” |

**Constraint:** `UNIQUE(user_id, upp_id)`

---

### 2.4 MVZ Global

#### `mvz_profiles`

Datos profesionales del MVZ. Puede representar tanto a un MVZ externo con tenant propio como a un `mvz_internal` dentro de un tenant `producer`.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `owner_tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant dueÃ±o del perfil (`type = 'mvz'` o `type = 'producer'`) |
| `user_id` | `UUID` | FK â†’ `profiles(id)` Â· Unique |
| `full_name` | `TEXT` | â€” |
| `license_number` | `TEXT` | NÃºmero de cÃ©dula. Unique |
| `status` | `TEXT` | `'active'` \| `'inactive'` |
| `created_at` | `TIMESTAMPTZ` | â€” |

Reglas operativas:

- `user_id` sigue siendo unico y representa una sola ficha profesional por usuario.
- Un mismo `owner_tenant_id` ya puede tener varios registros en `mvz_profiles`.
- `sql/migration_008_allow_multiple_mvz_profiles_per_tenant.sql` elimina la restriccion vieja que forzaba un solo MVZ por tenant.

---

#### `mvz_upp_assignments`

Asigna un MVZ a UPPs para trabajo de campo. Puede usarse en dos escenarios:

- MVZ externo (`mvz_government`) asignado por gobierno a ranchos de productores.
- MVZ interno (`mvz_internal`) sincronizado desde un tenant productor hacia sus propios ranchos.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `mvz_profile_id` | `UUID` | FK â†’ `mvz_profiles(id)` |
| `upp_id` | `UUID` | FK â†’ `upps(id)` Â· Puede ser de cualquier tenant `producer` |
| `status` | `TEXT` | `'active'` \| `'inactive'` |
| `assigned_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Usuario que otorgÃ³ o sincronizÃ³ la asignaciÃ³n |
| `assigned_at` | `TIMESTAMPTZ` | â€” |
| `unassigned_at` | `TIMESTAMPTZ` | Nullable |

**Constraint:** `UNIQUE(mvz_profile_id, upp_id)`

> âš ï¸ No tiene `tenant_id`. Puede operar cross-tenant para MVZ externos y dentro del mismo tenant productor para `mvz_internal`. El acceso se controla por `auth_mvz_assigned_to_upp()`.

---

### 2.5 Documentos

#### `document_types`

CatÃ¡logo global de tipos de documento. Lectura pÃºblica.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `key` | `TEXT` | Unique. Ej: `'ine'`, `'curp'`, `'deed'` |
| `name` | `TEXT` | â€” |
| `requires_expiry` | `BOOLEAN` | Si `TRUE`, debe tener fecha de vencimiento |
| `requires_identity_match` | `BOOLEAN` | Si `TRUE`, el OCR valida coincidencia con identidad del productor |

---

#### `producer_documents`

Documentos del productor. Solo puede haber **un documento activo** (`is_current = true`) por tipo por productor (Ã­ndice parcial Ãºnico).

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` |
| `producer_id` | `UUID` | FK â†’ `producers(id)` |
| `document_type_id` | `UUID` | FK â†’ `document_types(id)` |
| `file_storage_key` | `TEXT` | Key del archivo en Supabase Storage |
| `file_hash` | `TEXT` | Hash del archivo para verificar integridad |
| `status` | `TEXT` | `'pending'` \| `'validated'` \| `'expired'` \| `'rejected'` |
| `is_current` | `BOOLEAN` | `TRUE` si es el documento vigente de su tipo |
| `comments` | `TEXT` | Comentarios o motivos de retorno de documentacion Â· Nullable |
| `expiry_date` | `DATE` | Nullable |
| `extracted_fields` | `JSONB` | Campos extraÃ­dos por OCR |
| `ocr_confidence` | `NUMERIC` | Confianza del OCR (0â€“1) Â· Nullable |
| `ocr_engine_version` | `TEXT` | Nullable |

**Ãndice Ãºnico parcial:** `UNIQUE(producer_id, document_type_id) WHERE is_current = TRUE`

---

### 2.6 Animales

#### `animals`

Registro de bovinos por UPP. El `siniiga_tag` sigue siendo el identificador canonico del animal en todo el sistema.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK -> `tenants(id)` |
| `upp_id` | `UUID` | FK -> `upps(id)` |
| `siniiga_tag` | `TEXT` | Arete SINIIGA. Unique |
| `name` | `TEXT` | Nombre visible del animal. Nullable |
| `sex` | `TEXT` | `'M'` \| `'F'` |
| `birth_date` | `DATE` | Nullable |
| `breed` | `TEXT` | Raza. Nullable |
| `weight_kg` | `DOUBLE PRECISION` | Peso en kg. Nullable, >= 0 |
| `age_years` | `INTEGER` | Edad consolidada en anos. Nullable, >= 0 |
| `health_status` | `TEXT` | `'healthy'` \| `'observation'` \| `'quarantine'` |
| `last_vaccine_at` | `TIMESTAMPTZ` | Ultima vacuna registrada. Nullable |
| `status` | `TEXT` | `'active'` \| `'blocked'` \| `'in_transit'` \| `'inactive'` |
| `mother_animal_id` | `UUID` | FK -> `animals(id)` - Auto-referencia - Nullable |
| `created_at` | `TIMESTAMPTZ` | - |

Reglas recientes:

- `sql/migration_010_animals_backfill_and_collar_link.sql` agrega el perfil ampliado del animal sin duplicar `ear_tag`; el identificador canonico sigue siendo `siniiga_tag`.
- `weight_kg` y `age_years` tienen checks defensivos para evitar negativos.
- el backfill productivo se hace desde staging con `stg_animals_backfill` y `stg_collar_links_backfill`.
- la promocion canonica se ejecuta con `public.promote_animals_backfill_and_collar_links()` y debe abortar completa ante ambiguedad de arete, conflicto de sexo, nombres incompatibles o collares duplicados.

---
### 2.7 Pruebas Sanitarias

#### `test_types`

CatÃ¡logo de tipos de prueba sanitaria. Lectura pÃºblica.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `key` | `TEXT` | `'tb'` (Tuberculosis) \| `'br'` (Brucelosis) |
| `name` | `TEXT` | â€” |
| `validity_days` | `INTEGER` | DÃ­as de vigencia desde la fecha de muestra |

---

#### `field_tests`

Pruebas sanitarias realizadas en campo. Solo el MVZ asignado puede crearlas.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant del productor dueÃ±o del rancho |
| `animal_id` | `UUID` | FK â†’ `animals(id)` |
| `upp_id` | `UUID` | FK â†’ `upps(id)` |
| `mvz_profile_id` | `UUID` | FK â†’ `mvz_profiles(id)` Â· MVZ que realizÃ³ la prueba |
| `test_type_id` | `UUID` | FK â†’ `test_types(id)` |
| `sample_date` | `DATE` | Fecha de toma de muestra |
| `result` | `TEXT` | `'negative'` \| `'positive'` \| `'inconclusive'` |
| `valid_until` | `DATE` | Nullable |
| `captured_lat` | `NUMERIC` | Nullable |
| `captured_lng` | `NUMERIC` | Nullable |
| `created_at` | `TIMESTAMPTZ` | â€” |

---

#### `field_test_sync_events`

Registro de sincronizaciones offline del MVZ. Garantiza **idempotencia**: si el MVZ envÃ­a el mismo registro dos veces (por reconexiÃ³n), no se duplica.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `mvz_user_id` | `UUID` | FK â†’ `profiles(id)` |
| `client_mutation_id` | `TEXT` | ID generado por el cliente. Ãšnico por `mvz_user_id` |
| `field_test_id` | `UUID` | FK â†’ `field_tests(id)` Â· Nullable (si la sync fallÃ³) |
| `payload_json` | `JSONB` | Payload original del cliente |
| `synced_at` | `TIMESTAMPTZ` | â€” |

**Constraint:** `UNIQUE(mvz_user_id, client_mutation_id)`

---

### 2.8 MÃ³dulos Operativos

#### `state_quarantines`

Cuarentenas declaradas por el gobierno. Pueden ser estatales (zona geogrÃ¡fica) u operativas (UPP especÃ­fica).

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `declared_by_tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Siempre el tenant `government` |
| `upp_id` | `UUID` | FK â†’ `upps(id)` Â· Nullable para cuarentenas estatales |
| `status` | `TEXT` | `'active'` \| `'released'` \| `'suspended'` |
| `quarantine_type` | `TEXT` | `'state'` \| `'operational'` |
| `title` | `TEXT` | â€” |
| `reason` | `TEXT` | Nullable |
| `geojson` | `JSONB` | Ãrea geogrÃ¡fica en GeoJSON Â· Nullable |
| `started_at` | `TIMESTAMPTZ` | â€” |
| `released_at` | `TIMESTAMPTZ` | Nullable |
| `epidemiological_note` | `TEXT` | Nullable |
| `released_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `created_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |

---

#### `export_requests`

Solicitudes de exportaciÃ³n de ganado.

**Flujo de estados:** `requested` â†’ `mvz_validated` â†’ `final_approved`  
**Flujo de bloqueo:** `requested` â†’ `blocked` / `rejected`

**Soft delete admin:** usa `deleted_at` y `deleted_by_user_id`; no reutiliza `status`.
**Regla operativa de tenant:** `tenant_id` siempre apunta al tenant `producer` duenio de la `UPP`. El panel `government` las administra de forma global, pero no las reubica al tenant gobierno.
**Creacion desde gobierno:** `POST /api/admin/exports` debe derivar `tenant_id` desde `upps.tenant_id`.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|

| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant del productor |
| `producer_id` | `UUID` | FK â†’ `producers(id)` Â· Nullable |
| `upp_id` | `UUID` | FK â†’ `upps(id)` Â· Nullable |
| `status` | `TEXT` | `'requested'` \| `'mvz_validated'` \| `'final_approved'` \| `'blocked'` \| `'rejected'` |
| `compliance_60_rule` | `BOOLEAN` | Cumple regla del 60% Â· Nullable |
| `tb_br_validated` | `BOOLEAN` | Pruebas TB/BR validadas Â· Nullable |
| `blue_tag_assigned` | `BOOLEAN` | Arete azul asignado Â· Nullable |
| `monthly_bucket` | `DATE` | Mes de exportaciÃ³n (truncado al primer dÃ­a del mes) |
| `metrics_json` | `JSONB` | MÃ©tricas al momento de la solicitud |
| `blocked_reason` | `TEXT` | Nullable |
| `validated_by_mvz_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `approved_by_admin_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `deleted_at` | `TIMESTAMPTZ` | Marca de borrado logico admin · Nullable |
| `deleted_by_user_id` | `UUID` | FK -> `profiles(id)` · Nullable |

---

#### `movement_requests`

Solicitudes de movilizaciÃ³n REEMO. El productor las crea, el gobierno las aprueba.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant del productor |
| `producer_id` | `UUID` | FK â†’ `producers(id)` Â· Nullable |
| `upp_id` | `UUID` | FK â†’ `upps(id)` Â· Nullable |
| `status` | `TEXT` | `'requested'` \| `'approved'` \| `'rejected'` \| `'cancelled'` |
| `qr_code` | `TEXT` | CÃ³digo QR de movilizaciÃ³n aprobada Â· Nullable |
| `route_note` | `TEXT` | Nullable |
| `incidence_note` | `TEXT` | Nullable |
| `movement_date` | `DATE` | Nullable |

---

#### `normative_settings`

ConfiguraciÃ³n normativa por tenant con historial de cambios. Solo puede haber **una configuraciÃ³n activa por clave** (Ã­ndice parcial Ãºnico).

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Solo el gobierno la gestiona |
| `key` | `TEXT` | Clave de configuraciÃ³n. Ej: `max_export_heads` |
| `value_json` | `JSONB` | Valor en formato JSON |
| `effective_from` | `DATE` | Fecha desde la que aplica |
| `effective_until` | `DATE` | Nullable |
| `status` | `TEXT` | `'active'` \| `'inactive'` |
| `changed_by_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |

**Ãndice Ãºnico parcial:** `UNIQUE(tenant_id, key) WHERE status = 'active'`

---

### 2.9 CRM y Notificaciones

#### `appointment_requests`

Solicitudes de cita del landing pÃºblico. Cualquier visitante puede crearlas (polÃ­tica INSERT pÃºblica). Solo el gobierno las gestiona.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Siempre el tenant `government` |
| `full_name` | `TEXT` | â€” |
| `phone` | `TEXT` | Nullable |
| `email` | `TEXT` | Nullable |
| `requested_service` | `TEXT` | â€” |
| `requested_date` | `DATE` | Nullable |
| `requested_time` | `TEXT` | Nullable |
| `notes` | `TEXT` | Nullable |
| `status` | `TEXT` | `'requested'` \| `'contacted'` \| `'scheduled'` \| `'discarded'` |

---

#### `notification_events`

Notificaciones de la plataforma. Soporta envÃ­o personal (usuario especÃ­fico) o broadcast (tenant completo, filtrado por rol). El gobierno puede notificar a usuarios de otros tenants.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `sender_tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Tenant que genera la notificaciÃ³n |
| `target_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable Â· Target personal |
| `target_tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Nullable Â· Target broadcast |
| `target_role_key` | `TEXT` | Nullable Â· Filtra broadcast por rol dentro de `target_tenant_id` |
| `category` | `TEXT` | Ej: `sanitary`, `export`, `quarantine` |
| `title` | `TEXT` | â€” |
| `message` | `TEXT` | Nullable |
| `severity` | `TEXT` | `'info'` \| `'warning'` \| `'critical'` |
| `related_upp_id` | `UUID` | FK â†’ `upps(id)` Â· Nullable |
| `is_read` | `BOOLEAN` | `FALSE` por defecto |

> âš ï¸ `CHECK`: al menos uno de `target_user_id` o `target_tenant_id` debe estar definido.

---

#### `audit_logs`

BitÃ¡cora de acciones del sistema. Solo el gobierno puede leerla. Las inserciones deben hacerse **Ãºnicamente desde funciones `SECURITY DEFINER`** del servidor.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Nullable |
| `actor_user_id` | `UUID` | FK â†’ `profiles(id)` Â· Nullable |
| `role_key` | `TEXT` | Rol del actor al momento de la acciÃ³n |
| `action` | `TEXT` | Ej: `'create'`, `'update'`, `'delete'`, `'login'` |
| `resource` | `TEXT` | Tabla o entidad afectada. Ej: `producers`, `field_tests` |
| `resource_id` | `TEXT` | Nullable |
| `payload_json` | `JSONB` | Datos relevantes de la acciÃ³n Â· Nullable |
| `ip` | `TEXT` | Nullable |
| `user_agent` | `TEXT` | Nullable |
| `created_at` | `TIMESTAMPTZ` | â€” |

---

### 2.10 IoT y TelemetrÃ­a

Estas tablas soportan el flujo operativo de collares de campo y su telemetrÃ­a. Se modela con tres piezas:

1. `collars`: inventario y estado actual del collar.
2. `collar_animal_history`: auditorÃ­a de vinculaciones/desvinculaciones.
3. `telemetry`: stream de lecturas en el tiempo.

#### `collars`

Inventario de collares IoT. Un collar puede existir sin `tenant_id` y sin `animal_id` mientras estÃ¡ sin vender o sin vincular.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· Nullable mientras no estÃ© asignado a productor |
| `animal_id` | `UUID` | FK â†’ `animals(id)` Â· Nullable mientras no estÃ© vinculado |
| `collar_id` | `TEXT` | ID fÃ­sico Ãºnico del firmware (ej. `C34`) |
| `status` | `TEXT` | `'inactive'` \| `'active'` \| `'linked'` \| `'unlinked'` \| `'suspended'` \| `'retired'` |
| `firmware_version` | `TEXT` | VersiÃ³n de firmware cargada en el dispositivo |
| `purchased_at` | `TIMESTAMPTZ` | Fecha de compra/activaciÃ³n por productor Â· Nullable |
| `linked_at` | `TIMESTAMPTZ` | Fecha del Ãºltimo vÃ­nculo a animal Â· Nullable |
| `unlinked_at` | `TIMESTAMPTZ` | Fecha de Ãºltima desvinculaciÃ³n Â· Nullable |
| `created_at` | `TIMESTAMPTZ` | â€” |
| `updated_at` | `TIMESTAMPTZ` | â€” |

---

#### `collar_animal_history`

BitÃ¡cora histÃ³rica de vÃ­nculo collar â†” animal para trazabilidad y auditorÃ­a.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `UUID` | PK |
| `collar_id_fk` | `UUID` | FK â†’ `collars(id)` |
| `animal_id` | `UUID` | FK â†’ `animals(id)` |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` |
| `linked_by` | `UUID` | FK â†’ `profiles(id)` Â· Usuario que vinculÃ³ Â· Nullable |
| `unlinked_by` | `UUID` | FK â†’ `profiles(id)` Â· Usuario que desvinculÃ³ Â· Nullable |
| `linked_at` | `TIMESTAMPTZ` | Fecha/hora de vÃ­nculo |
| `unlinked_at` | `TIMESTAMPTZ` | Fecha/hora de desvinculaciÃ³n Â· `NULL` si sigue activo |
| `notes` | `TEXT` | Comentarios de operaciÃ³n Â· Nullable |

---

#### `telemetry`

Serie temporal de lecturas de sensores. Guarda `collar_uuid` como FK canÃ³nica y una copia de `collar_id` para consultas rÃ¡pidas.

| Columna | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `collar_uuid` | `UUID` | FK â†’ `collars(id)` |
| `collar_id` | `TEXT` | Copia denormalizada del identificador fÃ­sico |
| `tenant_id` | `UUID` | FK â†’ `tenants(id)` Â· denormalizado para RLS Â· Nullable |
| `animal_id` | `UUID` | FK â†’ `animals(id)` Â· denormalizado segÃºn vÃ­nculo activo Â· Nullable |
| `latitude` / `longitude` / `altitude` | `DOUBLE PRECISION` | GeoposiciÃ³n Â· Nullable |
| `speed` | `DOUBLE PRECISION` | Velocidad estimada Â· Nullable |
| `temperature` | `DOUBLE PRECISION` | Temperatura del collar/entorno Â· Nullable |
| `activity` | `INTEGER` | Nivel de actividad resumido Â· Nullable |
| `bat_voltage` / `bat_percent` | `DOUBLE PRECISION` / `INTEGER` | Estado de baterÃ­a |
| `accel_x` / `accel_y` / `accel_z` | `DOUBLE PRECISION` | AcelerÃ³metro |
| `gyro_x` / `gyro_y` / `gyro_z` | `DOUBLE PRECISION` | Giroscopio |
| `rssi` | `INTEGER` | SeÃ±al LoRa recibida |
| `snr` | `DOUBLE PRECISION` | RelaciÃ³n seÃ±al/ruido |
| `timestamp` | `TIMESTAMPTZ` | Momento del evento (device/server ingest) |

Notas operativas:

- Otorgar `USAGE, SELECT` en `telemetry_id_seq` al rol `authenticated` para inserts por `BIGSERIAL`.
- Para consultas histÃ³ricas, usar `idx_telemetry_timestamp` (orden DESC por tiempo).

---

## 3. Ãndices

> No agregar Ã­ndices adicionales hasta tener datos reales. Identificar queries lentos con `EXPLAIN ANALYZE` en Supabase.

| Ãndice | Tabla | Columnas | PropÃ³sito |
|---|---|---|---|
| `idx_tenants_type` | `tenants` | `type` | Routing por tipo de tenant en login |
| `idx_tenant_memberships_tenant_user` | `tenant_memberships` | `tenant_id, user_id` | Lookup en funciones RLS |
| `idx_tenant_memberships_user` | `tenant_memberships` | `user_id` | Todos los tenants de un usuario |
| `idx_tenant_roles_tenant` | `tenant_roles` | `tenant_id` | Roles disponibles en un tenant |
| `idx_tenant_user_roles_membership` | `tenant_user_roles` | `membership_id` | Roles de una membresÃ­a |
| `idx_producers_owner_tenant` | `producers` | `owner_tenant_id` | Lookup productor por su tenant |
| `idx_producers_user` | `producers` | `user_id` | Lookup productor por usuario autenticado |
| `idx_upps_tenant` | `upps` | `tenant_id` | Ranchos de un tenant |
| `idx_upps_producer` | `upps` | `producer_id` | Ranchos de un productor |
| `idx_user_upp_access_tenant` | `user_upp_access` | `tenant_id` | Accesos dentro de un tenant |
| `idx_user_upp_access_user` | `user_upp_access` | `user_id` | Accesos de un usuario |
| `idx_mvz_profiles_owner_tenant` | `mvz_profiles` | `owner_tenant_id` | Lookup MVZ por su tenant |
| `idx_mvz_upp_assignments_mvz` | `mvz_upp_assignments` | `mvz_profile_id` | Ranchos asignados a un MVZ |
| `idx_mvz_upp_assignments_upp` | `mvz_upp_assignments` | `upp_id` | MVZ asignados a un rancho |
| `idx_producer_documents_tenant` | `producer_documents` | `tenant_id` | Documentos de un tenant |
| `idx_producer_documents_producer` | `producer_documents` | `producer_id` | Documentos de un productor |
| `idx_producer_documents_status` | `producer_documents` | `status` | Filtrar por estado |
| `idx_animals_tenant` | `animals` | `tenant_id` | Animales de un tenant |
| `idx_animals_upp` | `animals` | `upp_id` | Animales de un rancho |
| `idx_animals_status` | `animals` | `status` | Filtrar por estado |
| `idx_field_tests_tenant` | `field_tests` | `tenant_id` | Pruebas de un tenant |
| `idx_field_tests_animal` | `field_tests` | `animal_id` | Historial de un animal |
| `idx_field_tests_upp` | `field_tests` | `upp_id` | Pruebas en un rancho |
| `idx_field_tests_mvz` | `field_tests` | `mvz_profile_id` | Pruebas por MVZ |
| `idx_field_tests_sample_date` | `field_tests` | `sample_date` | Consultas por rango de fechas |
| `idx_field_test_sync_events_mvz` | `field_test_sync_events` | `mvz_user_id, synced_at DESC` | Historial de sync |
| `idx_state_quarantines_declared_by` | `state_quarantines` | `declared_by_tenant_id, status` | Cuarentenas activas |
| `idx_state_quarantines_upp` | `state_quarantines` | `upp_id` | Cuarentenas de una UPP |
| `idx_export_requests_tenant_status` | `export_requests` | `tenant_id, status` | Exportaciones por estado |
| `idx_export_requests_monthly` | `export_requests` | `tenant_id, monthly_bucket` | Exportaciones por mes |
| `idx_movement_requests_tenant_status` | `movement_requests` | `tenant_id, status` | Movilizaciones por estado |
| `idx_normative_settings_tenant_key` | `normative_settings` | `tenant_id, key, status` | ConfiguraciÃ³n vigente |
| `idx_appointment_requests_tenant_at` | `appointment_requests` | `tenant_id, status, created_at DESC` | CRM por estado y fecha |
| `idx_notification_events_target_user` | `notification_events` | `target_user_id, created_at DESC` | Notificaciones personales |
| `idx_notification_events_target_ten` | `notification_events` | `target_tenant_id, created_at DESC` | Notificaciones broadcast |
| `idx_audit_logs_tenant_at` | `audit_logs` | `tenant_id, created_at DESC` | BitÃ¡cora por tenant |
| `idx_audit_logs_actor` | `audit_logs` | `actor_user_id, created_at DESC` | Acciones de un usuario |
| `idx_collars_collar_id` | `collars` | `collar_id` | Lookup por identificador fÃ­sico |
| `idx_collars_tenant_id` | `collars` | `tenant_id` | Collares por productor/tenant |
| `idx_collars_animal_id` | `collars` | `animal_id` | Collar activo/histÃ³rico por animal |
| `idx_collars_status` | `collars` | `status` | Filtro por estado operativo |
| `idx_cah_collar` | `collar_animal_history` | `collar_id_fk` | Historial de un collar |
| `idx_cah_animal` | `collar_animal_history` | `animal_id` | Historial de un animal |
| `idx_cah_linked` | `collar_animal_history` | `linked_at DESC` | Eventos recientes de vÃ­nculo |
| `idx_telemetry_collar_uuid` | `telemetry` | `collar_uuid` | Lecturas por collar |
| `idx_telemetry_collar_id` | `telemetry` | `collar_id` | Lookup rÃ¡pido por ID fÃ­sico |
| `idx_telemetry_animal_id` | `telemetry` | `animal_id` | TelemetrÃ­a de un animal |
| `idx_telemetry_tenant_id` | `telemetry` | `tenant_id` | TelemetrÃ­a por tenant |
| `idx_telemetry_timestamp` | `telemetry` | `timestamp DESC` | Series temporales recientes |

---

## 4. Vistas

Todas las vistas usan `SECURITY INVOKER`, por lo que **RLS se aplica automÃ¡ticamente** con el contexto del usuario autenticado. No es necesario filtrar manualmente por usuario en el cliente.

---

### `v_user_context`

Contexto completo del usuario autenticado. Usar al iniciar sesiÃ³n para determinar el panel y cargar el estado inicial.

```sql
SELECT * FROM v_user_context;
```

> Si el usuario tiene mÃºltiples roles retorna una fila por cada rol. Usar `ORDER BY role_priority ASC LIMIT 1` para el rol principal.

| Columna | DescripciÃ³n |
|---|---|
| `user_id` | ID del usuario |
| `user_status` | Estado del perfil |
| `tenant_id` | ID del tenant |
| `tenant_type` | `'government'` \| `'producer'` \| `'mvz'` |
| `tenant_slug` | Ej: `gobierno-durango` |
| `membership_id` | ID de la membresÃ­a activa |
| `role_key` | Clave del rol asignado |
| `role_priority` | Prioridad (menor = mÃ¡s privilegio) |

---

### `v_user_permissions`

Todos los permisos activos del usuario. Cargar al iniciar sesiÃ³n para controlar visibilidad de UI.

```sql
-- Verificar un permiso especÃ­fico
SELECT EXISTS (
  SELECT 1 FROM v_user_permissions
  WHERE permission_key = 'admin.producers.write'
);
```

| Columna | DescripciÃ³n |
|---|---|
| `tenant_id` | Tenant donde aplica |
| `tenant_type` | Tipo del tenant |
| `role_key` | Rol a travÃ©s del cual se otorga |
| `permission_key` | Ej: `admin.producers.write` |
| `permission_module` | `'admin'` \| `'mvz'` \| `'producer'` |

---

### `v_producers_admin`

Panel de gobierno: resumen de productores con mÃ©tricas de ranchos y estatus documental.

```sql
-- Productores con problemas documentales
SELECT full_name, docs_pending, docs_issues
FROM v_producers_admin
WHERE docs_issues > 0 OR docs_pending > 0
ORDER BY docs_issues DESC;
```

| Columna | DescripciÃ³n |
|---|---|
| `producer_id` | â€” |
| `full_name` | â€” |
| `producer_tenant_slug` | Slug del tenant del productor |
| `total_upps` | Total de ranchos |
| `active_upps` | Ranchos activos |
| `quarantined_upps` | Ranchos en cuarentena |
| `total_active_animals` | Animales activos en todos sus ranchos |
| `docs_validated` | Documentos vigentes validados |
| `docs_pending` | Documentos pendientes |
| `docs_issues` | Documentos vencidos o rechazados |

---

### `v_mvz_admin`

Panel de gobierno: MVZ globales con ranchos asignados y actividad de pruebas.

| Columna | DescripciÃ³n |
|---|---|
| `mvz_profile_id` | â€” |
| `full_name` | â€” |
| `license_number` | CÃ©dula profesional |
| `active_assignments` | Ranchos actualmente asignados |
| `total_assignments` | Total histÃ³rico |
| `tests_last_year` | Pruebas en los Ãºltimos 365 dÃ­as |
| `tests_last_30_days` | Pruebas en los Ãºltimos 30 dÃ­as |

---

### `v_producer_dashboard`

Panel del productor: mÃ©tricas agregadas de todos sus ranchos. RLS filtra automÃ¡ticamente al tenant del productor autenticado.

```sql
SELECT * FROM v_producer_dashboard
WHERE producer_id = $producer_id;
```

| Columna | DescripciÃ³n |
|---|---|
| `total_upps` | Total de ranchos |
| `active_animals` | Animales activos |
| `animals_in_transit` | En movilizaciÃ³n |
| `positive_tests_90d` | Pruebas positivas en los Ãºltimos 90 dÃ­as |
| `exports_pending` | Exportaciones pendientes de validaciÃ³n |
| `exports_approved_this_month` | Exportaciones aprobadas este mes |
| `movements_pending` | Movilizaciones REEMO pendientes |

---

### `v_mvz_assignments`

Panel del MVZ: ranchos asignados con estatus sanitario. RLS filtra al MVZ autenticado.

```sql
-- Ranchos con alertas activas
SELECT upp_name, tb_status, br_status, sanitary_alert
FROM v_mvz_assignments
WHERE sanitary_alert != 'ok'
ORDER BY sanitary_alert;
```

| Columna | DescripciÃ³n |
|---|---|
| `upp_id` / `upp_name` | Datos del rancho |
| `producer_name` | Productor dueÃ±o |
| `active_animals` | Animales activos |
| `tb_last_date` / `tb_valid_until` / `tb_status` | Estado de tuberculosis |
| `br_last_date` / `br_valid_until` / `br_status` | Estado de brucelosis |
| `sanitary_alert` | Alerta consolidada del rancho |

**Valores de `sanitary_alert`:**

| Valor | Significado | Color UI |
|---|---|---|
| `ok` | Sin alertas, pruebas vigentes y negativas | ðŸŸ¢ Verde |
| `por_vencer` | Alguna prueba vence en los prÃ³ximos 30 dÃ­as | ðŸŸ¡ Amarillo |
| `prueba_vencida` | Alguna prueba estÃ¡ vencida | ðŸŸ  Naranja |
| `sin_pruebas` | Sin registro de pruebas TB o BR | âšª Gris |
| `positivo` | Alguna prueba resultÃ³ positiva | ðŸ”´ Rojo |
| `cuarentena` | El rancho estÃ¡ en cuarentena activa | ðŸ”´ Rojo oscuro |

---

### `v_animals_sanitary`

Animales con su ultimo resultado de prueba TB y BR, perfil operativo y snapshot del collar activo. Es el contrato principal para detalle de rancho en panel productor y MVZ.

```sql
-- Animales con alertas en un rancho
SELECT siniiga_tag, sex, tb_status, br_status, sanitary_alert
FROM v_animals_sanitary
WHERE upp_id = $upp_id
  AND sanitary_alert != 'ok'
ORDER BY sanitary_alert, siniiga_tag;
```

| Columna | Descripcion |
|---|---|
| `animal_id` / `siniiga_tag` | Identificacion |
| `name`, `breed`, `weight_kg`, `age_years` | Perfil operativo del animal |
| `sex` | `'M'` \| `'F'` |
| `health_status`, `last_vaccine_at` | Snapshot sanitario resumido |
| `animal_status` | Estado del animal |
| `upp_name` | Rancho al que pertenece |
| `current_collar_uuid`, `current_collar_id`, `current_collar_status`, `current_collar_linked_at` | Collar activo vinculado al animal |
| `tb_date` / `tb_result` / `tb_status` | Estado TB |
| `br_date` / `br_result` / `br_status` | Estado BR |
| `sanitary_alert` | `ok` \| `por_vencer` \| `prueba_vencida` \| `sin_pruebas` \| `positivo` \| `inactivo` |

La vista es el contrato principal consumido por:

- tablas de animales en productor y MVZ
- ficha detalle de animales
- vistas admin que muestran detalle consolidado del animal en exportaciones

### Promocion de backfill y collar

La migracion 010 tambien deja un flujo SQL-first para consolidar perfil faltante y vinculo de collar:

```sql
SELECT * FROM public.promote_animals_backfill_and_collar_links();
```

Garantias del flujo:

- matching por arete normalizado (`siniiga_tag`)
- no usa `name` como clave de resolucion
- no permite dos collares activos para el mismo animal
- no permite un historial abierto duplicado en `collar_animal_history`
- mantiene `collars` y `collar_animal_history` consistentes e idempotentes

---

## 5. Funciones Helper RLS

Todas las funciones son `SECURITY DEFINER` con `SET search_path = public`.

| Funcion | Parametros | Retorna | Descripcion |
|---|---|---|---|
| `auth_get_panel_type()` | - | `TEXT` | Tipo de tenant del usuario. Usar en login para routing. |
| `auth_in_tenant(p_tenant_id)` | `UUID` | `BOOLEAN` | Verifica si el usuario es miembro activo del tenant. |
| `auth_has_tenant_role(p_tenant_id, p_role_key)` | `UUID, TEXT` | `BOOLEAN` | Verifica si el usuario tiene este rol en el tenant. |
| `auth_has_tenant_permission(p_tenant_id, p_permission_key)` | `UUID, TEXT` | `BOOLEAN` | Verifica si el usuario tiene este permiso por cualquiera de sus roles. |
| `auth_has_upp_access(p_upp_id, p_min_level)` | `UUID, TEXT` | `BOOLEAN` | Verifica acceso minimo a la UPP. |
| `auth_mvz_assigned_to_upp(p_upp_id)` | `UUID` | `BOOLEAN` | Verifica si el MVZ autenticado tiene este rancho asignado. |

```sql
-- Routing en login
SELECT public.auth_get_panel_type() AS panel;

-- Verificar permiso antes de una operacion (en Edge Function)
SELECT public.auth_has_tenant_permission(
  $tenant_id,
  'producer.bovinos.write'
) AS can_write;

-- Verificar acceso a UPP con nivel minimo editor
SELECT public.auth_has_upp_access($upp_id, 'editor');
```

---
## 6. Operaciones Frecuentes

### Alta de Productor (desde gobierno)

```sql
-- 1. Crear usuario en Supabase Auth â†’ copiar $user_id

-- 2. Crear el tenant del productor
INSERT INTO public.tenants (type, slug, name)
VALUES ('producer', 'productor-juan-perez', 'Juan PÃ©rez')
RETURNING id; -- guardar como $producer_tenant_id

-- 3. Crear el perfil del productor
INSERT INTO public.producers (owner_tenant_id, user_id, full_name, curp)
VALUES ($producer_tenant_id, $user_id, 'Juan PÃ©rez', 'PEPJ800101HDFRNN01');

-- 4. Crear membresÃ­a
INSERT INTO public.tenant_memberships (tenant_id, user_id)
VALUES ($producer_tenant_id, $user_id)
RETURNING id; -- guardar como $membership_id

-- 5. Ejecutar durania_v5_seed_roles.sql para el nuevo tenant

-- 6. Asignar rol producer
INSERT INTO public.tenant_user_roles (membership_id, tenant_role_id)
SELECT $membership_id, id FROM public.tenant_roles
WHERE tenant_id = $producer_tenant_id AND key = 'producer';
```

---

### Alta de MVZ Global (desde gobierno)

```sql
-- 1. Crear usuario en Supabase Auth â†’ $user_id

-- 2. Crear tenant del MVZ
INSERT INTO public.tenants (type, slug, name)
VALUES ('mvz', 'mvz-dr-garcia', 'Dr. GarcÃ­a')
RETURNING id; -- $mvz_tenant_id

-- 3. Crear perfil MVZ
INSERT INTO public.mvz_profiles (owner_tenant_id, user_id, full_name, license_number)
VALUES ($mvz_tenant_id, $user_id, 'Dr. GarcÃ­a', '12345678');

-- 4. MembresÃ­a y rol (igual que productor, usando key = 'mvz_government')
```

---

### Asignar MVZ a un Rancho (desde gobierno)

```sql
INSERT INTO public.mvz_upp_assignments (mvz_profile_id, upp_id, assigned_by_user_id)
VALUES ($mvz_profile_id, $upp_id, auth.uid());
```

---

### Alta de Empleado en un Rancho (desde productor)

```sql
-- 1. Crear usuario en Supabase Auth â†’ $user_id

-- 2. Crear membresÃ­a en el tenant del productor
INSERT INTO public.tenant_memberships (tenant_id, user_id, invited_by_user_id)
VALUES ($producer_tenant_id, $user_id, auth.uid())
RETURNING id; -- $membership_id

-- 3. Asignar rol employee
INSERT INTO public.tenant_user_roles (membership_id, tenant_role_id)
SELECT $membership_id, id FROM public.tenant_roles
WHERE tenant_id = $producer_tenant_id AND key = 'employee';

-- 4. Dar acceso a UPPs especÃ­ficas (opcional)
INSERT INTO public.user_upp_access (tenant_id, user_id, upp_id, access_level, granted_by_user_id)
VALUES ($producer_tenant_id, $user_id, $upp_id, 'editor', auth.uid());
```

---

### Alta de MVZ Interno (desde productor)

```sql
-- 1. Crear usuario en Supabase Auth â†’ $user_id

-- 2. Crear membresÃ­a en el tenant del productor
INSERT INTO public.tenant_memberships (tenant_id, user_id, invited_by_user_id)
VALUES ($producer_tenant_id, $user_id, auth.uid())
RETURNING id; -- $membership_id

-- 3. Asignar rol mvz_internal
INSERT INTO public.tenant_user_roles (membership_id, tenant_role_id)
SELECT $membership_id, id FROM public.tenant_roles
WHERE tenant_id = $producer_tenant_id AND key = 'mvz_internal';

-- 4. Crear ficha profesional MVZ
INSERT INTO public.mvz_profiles (owner_tenant_id, user_id, full_name, license_number)
VALUES ($producer_tenant_id, $user_id, 'Dra. Veterinaria Interna', 'ABC123456')
RETURNING id; -- $mvz_profile_id

-- 5. Asignar ranchos operativos
INSERT INTO public.user_upp_access (tenant_id, user_id, upp_id, access_level, granted_by_user_id)
VALUES ($producer_tenant_id, $user_id, $upp_id, 'editor', auth.uid());

-- 6. Sincronizar visibilidad del panel MVZ
INSERT INTO public.mvz_upp_assignments (mvz_profile_id, upp_id, assigned_by_user_id)
VALUES ($mvz_profile_id, $upp_id, auth.uid())
ON CONFLICT (mvz_profile_id, upp_id) DO NOTHING;
```

---

### Registrar Prueba Sanitaria (desde MVZ)

```sql
INSERT INTO public.field_tests
  (tenant_id, animal_id, upp_id, mvz_profile_id, test_type_id, sample_date, result, valid_until)
VALUES
  ($tenant_id, $animal_id, $upp_id, $mvz_profile_id, $test_type_id,
   CURRENT_DATE, 'negative', CURRENT_DATE + INTERVAL '365 days');
```

---

### Sync Offline de Prueba (app mÃ³vil MVZ)

```sql
-- Insertar con client_mutation_id para idempotencia
INSERT INTO public.field_test_sync_events
  (mvz_user_id, client_mutation_id, payload_json)
VALUES
  (auth.uid(), $client_uuid, $payload::jsonb)
ON CONFLICT (mvz_user_id, client_mutation_id) DO NOTHING
RETURNING id;
-- Si retorna vacÃ­o, el registro ya existÃ­a. No duplicar la field_test.
```

---

### Vincular un Collar a un Animal

```sql
-- 1) Actualizar estado actual del collar
UPDATE public.collars
SET
  tenant_id = $tenant_id,
  animal_id = $animal_id,
  status = 'linked',
  linked_at = now(),
  updated_at = now()
WHERE id = $collar_uuid;

-- 2) Insertar evento historico
INSERT INTO public.collar_animal_history
  (collar_id_fk, animal_id, tenant_id, linked_by, linked_at, notes)
VALUES
  ($collar_uuid, $animal_id, $tenant_id, auth.uid(), now(), $notes);
```

---

### Registrar TelemetrÃ­a IoT

```sql
INSERT INTO public.telemetry
  (collar_uuid, collar_id, tenant_id, animal_id,
   latitude, longitude, speed, temperature,
   bat_voltage, bat_percent, rssi, snr, timestamp)
VALUES
  ($collar_uuid, $collar_id, $tenant_id, $animal_id,
   $lat, $lng, $speed, $temp,
   $bat_v, $bat_pct, $rssi, $snr, now());
```

---

## 7. Resumen de Accesos RLS

| Tabla / Vista | `tenant_admin` (gov) | `tenant_admin` (producer) | `producer` | `employee` | `mvz_government` | `mvz_internal` |
|---|---|---|---|---|---|---|
| `tenants` | R/W propio | R propio | R propio | â€” | R propio | â€” |
| `producers` | R/W todos | R propio | R propio | â€” | â€” | â€” |
| `upps` | R/W todos | R/W propio | R/W propio | R asignadas | R asignadas | R asignadas |
| `animals` | R/W todos | R/W rancho | R/W rancho | R/W rancho | R asignadas | R/W asignadas |
| `field_tests` | R/W todos | R rancho | R rancho | R rancho | R/W asignadas | R/W asignadas |
| `mvz_upp_assignments` | R/W todos | R propio | R propio | â€” | R propio | â€” |
| `producer_documents` | R/W todos | R/W propio | R/W propio | â€” | â€” | â€” |
| `export_requests` | R/W todos | R/C propio | R/C propio | R/C propio | R/U validar | â€” |
| `movement_requests` | R/U aprobar | R/C propio | R/C propio | R/C propio | â€” | â€” |
| `state_quarantines` | R/W todos | R afectan | R afectan | R afectan | R/W operativas | R/W operativas |
| `notification_events` | R/W todos | R propias | R propias | R propias | R propias | R propias |
| `appointment_requests` | R/W todos | â€” | â€” | â€” | â€” | â€” |
| `audit_logs` | R todos | â€” | â€” | â€” | â€” | â€” |
| `collars` | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio |
| `collar_animal_history` | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio |
| `telemetry` | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio | R/W propio |
| `v_producer_dashboard` | R todos | R propio | R propio | R propio | â€” | â€” |
| `v_mvz_assignments` | R todos | R propio | R propio | â€” | R propio | R propio |
| `v_animals_sanitary` | R todos | R propio | R propio | R propio | R asignadas | R asignadas |

**Leyenda:**
- `R` â€” Solo lectura
- `R/W` â€” Lectura y escritura completa
- `R/C` â€” Lectura y creaciÃ³n (no puede modificar ajenos)
- `R/U` â€” Lectura y actualizaciÃ³n
- `â€”` â€” Sin acceso
- `propio` â€” Solo sus propios datos
- `asignadas` â€” Solo UPPs/ranchos asignados
- `todos` â€” Todos los registros del sistema

---

## 8. Actualizacion v6 (MVZ Jerarquico)

Esta version agrega soporte completo de jerarquia MVZ Gobierno -> Rancho (`UPP`) con dashboard global, panel contextual por rancho, modulos internos y realtime.

### 8.1 Tablas nuevas

#### `mvz_visits`

Visitas/citas de MVZ por rancho.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | Tenant productor del rancho |
| `upp_id` | `UUID` | Rancho objetivo |
| `mvz_profile_id` | `UUID` | MVZ responsable |
| `visit_type` | `TEXT` | Tipo de visita |
| `status` | `TEXT` | `scheduled` \| `in_progress` \| `completed` \| `cancelled` |
| `scheduled_at` | `TIMESTAMPTZ` | Fecha programada |
| `started_at` / `finished_at` | `TIMESTAMPTZ` | Tiempos de ejecucion |

#### `animal_vaccinations`

Registro de vacunacion por animal dentro de una UPP.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | Tenant productor |
| `upp_id` | `UUID` | Rancho |
| `animal_id` | `UUID` | Animal vacunado |
| `vaccine_name` | `TEXT` | Vacuna aplicada/planeada |
| `status` | `TEXT` | `pending` \| `applied` \| `overdue` \| `cancelled` |
| `applied_at` / `due_at` | `DATE` | Fechas sanitarias |

#### `sanitary_incidents`

Incidencias sanitarias por animal y rancho.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | Tenant productor |
| `upp_id` | `UUID` | Rancho |
| `animal_id` | `UUID` | Animal afectado |
| `incident_type` | `TEXT` | Tipo de incidencia |
| `severity` | `TEXT` | `low` \| `medium` \| `high` \| `critical` |
| `status` | `TEXT` | `open` \| `in_progress` \| `resolved` \| `dismissed` |

#### `upp_documents`

Documentos asociados al rancho (`UPP`) en lugar de solo productor.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | Tenant productor |
| `upp_id` | `UUID` | Rancho |
| `document_type` | `TEXT` | Tipo de documento |
| `file_storage_key` | `TEXT` | Ruta en Storage |
| `status` | `TEXT` | `pending` \| `validated` \| `expired` \| `rejected` |
| `comments` | `TEXT` | Comentarios o motivos de retorno de documentacion Â· Nullable |
| `is_current` | `BOOLEAN` | Documento vigente por tipo |

### 8.2 Vistas nuevas

- `v_mvz_dashboard_global`: KPIs agregados por MVZ sin duplicidad.
- `v_mvz_ranch_overview`: cabecera + metricas contextuales del rancho.
- `v_mvz_ranch_reports`: resumen operativo (exportaciones, movimientos, pruebas e incidencias).

### 8.3 Permisos nuevos (modulo `mvz`)

- `mvz.ranch.read`
- `mvz.ranch.animals.read`
- `mvz.ranch.clinical.read`
- `mvz.ranch.vaccinations.read` / `mvz.ranch.vaccinations.write`
- `mvz.ranch.incidents.read` / `mvz.ranch.incidents.write`
- `mvz.ranch.reports.read`
- `mvz.ranch.documents.read` / `mvz.ranch.documents.write`
- `mvz.ranch.visits.read` / `mvz.ranch.visits.write`

### 8.4 RLS y Realtime

- Todas las tablas nuevas tienen RLS habilitado.
- Regla central MVZ: acceso solo a ranchos asignados (`auth_mvz_assigned_to_upp(upp_id)`).
- Se agregan tablas nuevas a `supabase_realtime` para `postgres_changes`.

### 8.5 Endpoints jerarquicos MVZ

- `GET /api/mvz/dashboard` (extendido)
- `GET /api/mvz/ranchos/:uppId`
- `GET /api/mvz/ranchos/:uppId/overview`
- `GET /api/mvz/ranchos/:uppId/animales`
- `GET /api/mvz/ranchos/:uppId/historial-clinico`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/vacunacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/incidencias`
- `GET /api/mvz/ranchos/:uppId/reportes`
- `GET|POST /api/mvz/ranchos/:uppId/documentacion`
- `GET|POST|PATCH /api/mvz/ranchos/:uppId/visitas`

---

## 9. Actualizacion v7 (IoT Telemetria)

Esta version agrega soporte de telemetria IoT en campo para collares de bovinos.

### 9.1 Tablas nuevas

- `collars`: inventario, asignacion y estado operativo del dispositivo.
- `collar_animal_history`: auditoria de vinculos/desvinculos collar â†” animal.
- `telemetry`: lecturas historicas del collar (GPS, actividad, bateria e IMU).

### 9.2 Politicas y permisos

- RLS habilitado en las tres tablas.
- Politica base por `tenant_id` para usuarios con membresia activa en `tenant_memberships`.
- Grants:
  - `authenticated`: `SELECT, INSERT, UPDATE, DELETE` en las tres tablas.
  - `anon`: `SELECT` en `collars` y `telemetry` (si se requiere lectura publica).
  - Secuencia `public.telemetry_id_seq`: `USAGE, SELECT` para `authenticated`.

### 9.3 Integridad y cardinalidad

- `collars.collar_id` es `UNIQUE` y representa el ID fisico del firmware.
- `telemetry.collar_uuid` referencia `collars(id)` con `ON DELETE RESTRICT` para evitar huÃ©rfanos.
- `collar_animal_history` guarda trazabilidad historica aun cuando un collar cambie de animal.
