# Estructura de Rutas de Almacenamiento - Documentos

**Status:** Canonical  
**Owner:** Engineering  
**Last Updated:** 2026-03-20  
**Related:** `src/modules/producer/documents/infra/supabase/`

---

## Resumen

Los documentos (personales y de UPP) se almacenan en Supabase Storage bajo el bucket `Documents_producer` con una estructura jerárquica que aísla datos por tenant y productor.

---

## Estructura General

```
Documents_producer/
  {tenantId}/
    {producerId}/
      personal/
        {documentType}/
          {timestamp}_{filename}
      upp/
        {uppId}/
          {documentType}/
            {timestamp}_{filename}
```

### Ejemplo Real

```
Documents_producer/
  550e8400-e29b-41d4-a716-446655440000/      ← tenant de Productor "Juan Pérez"
    a16e3e8f-c99f-4e1e-a1f1-9d5c4e8b7f1a/    ← productor Juan
      personal/
        ine/
          1710951234_documento.pdf
          1710951300_documento.pdf            ← documento anterior
      upp/
        f09e7d8c-b88e-4f0d-8e1c-7c5b4d3e2f1a/  ← UPP "Rancho El Porvenir"
          sanidad/
            1710951400_certificado-sanitario.pdf
          documentacion/
            1710951500_licencia.pdf
```

---

## Rutas por Tipo de Documento

### 📄 Documentos Personales (Productor)

**Ruta:**
```
{tenantId}/{producerId}/personal/{documentType}/{timestamp}_{originalFilename}
```

**Documentos soportados:**
- `ine` — Identificación Nacional de Elector (vencimiento obligatorio)
- `curp` — Clave Única de Registro de Población (sin vencimiento)
- `comprobante_domicilio` — Comprobante de Domicilio (vencimiento basado en fecha de emisión)

**Ejemplo:**
```
550e8400-e29b-41d4-a716-446655440000/a16e3e8f-c99f-4e1e-a1f1-9d5c4e8b7f1a/personal/ine/1710951234_INE-2024.pdf
```

**Características:**
- Un productor puede tener múltiples documentos personales
- Solo el documento con `is_current = true` en la BD es el "vigente"
- Los documentos anteriores se conservan en storage para auditoría
- Acceso controlado por permisos: `producer.documents.read` / `.write`

---

### 🏪 Documentos de UPP (Rancho)

**Ruta:**
```
{tenantId}/{producerId}/upp/{uppId}/{documentType}/{timestamp}_{originalFilename}
```

**Documentos soportados:**
- `sanidad` — Certificados sanitarios
- `documentacion` — Licencias y autorizaciones
- Otros tipos según necesidad

**Ejemplo:**
```
550e8400-e29b-41d4-a716-446655440000/a16e3e8f-c99f-4e1e-a1f1-9d5c4e8b7f1a/upp/f09e7d8c-b88e-4f0d-8e1c-7c5b4d3e2f1a/sanidad/1710951400_certificado.pdf
```

**Características:**
- Los documentos están organizados por UPP (rancho)
- Cada UPP pertenece a un único productor (relación FK en tabla `upps`)
- Acceso controlado por permisos y jerarquía MVZ: `mvz.ranch.documents.read` / `.write`
- Auditoría de cambios vía campo `uploaded_by_user_id` en `upp_documents`

---

## Metadatos y Recuperación

### Tabla `producer_documents`

| Campo | Tipo | Propósito |
|-------|------|----------|
| `id` | UUID | Identificador único del registro |
| `tenant_id` | UUID | FK a `tenants` — aislamiento multi-tenant |
| `producer_id` | UUID | FK a `producers` — usado para construir ruta |
| `document_type_id` | UUID | FK a `document_types` |
| `file_storage_key` | TEXT | Ruta exacta en bucket (sincronizado con storage) |
| `file_hash` | TEXT | SHA256 del archivo para integridad |
| `status` | TEXT | `pending` \| `validated` \| `expired` \| `rejected` |
| `comments` | TEXT | Comentario de validación/rechazo visible en panel productor |
| `is_current` | BOOLEAN | Indica si es la versión vigente |
| `expiry_date` | DATE | Vencimiento del documento (si aplica) |
| `uploaded_at` | TIMESTAMPTZ | Fecha de carga |

### Tabla `upp_documents`

| Campo | Tipo | Propósito |
|-------|------|----------|
| `id` | UUID | Identificador único |
| `tenant_id` | UUID | FK a `tenants` |
| `upp_id` | UUID | FK a `upps` — UPP propietaria |
| `document_type` | TEXT | Tipo de documento (sanidad, documentacion, etc.) |
| `file_storage_key` | TEXT | Ruta exacta en bucket |
| `file_hash` | TEXT | SHA256 para validación de integridad |
| `status` | TEXT | Estado del documento |
| `comments` | TEXT | Comentario de validación/rechazo visible en panel productor |
| `is_current` | BOOLEAN | Versión vigente |
| `uploaded_by_user_id` | UUID | Quién subió el documento |
| `expiry_date` | DATE | Vencimiento (si aplica) |
| `issued_at` | DATE | Fecha de emisión |
| `uploaded_at` | TIMESTAMPTZ | Fecha de carga |

---

## Operaciones Clave

### Subir Documento del Productor

1. **Validar permisos:** `producer.documents.write`
2. **Obtener producer_id:** Desde `findProducerIdForUserOrTenant(tenantId, userId)`
3. **Calcular hash:** SHA256 del archivo binario
4. **Construir ruta:**
   ```typescript
   const fileStorageKey = `${tenantId}/${producerId}/personal/${documentType}/${Date.now()}_${file.name}`;
   ```
5. **Subir a storage:** `supabaseAdmin.storage.from(DOCUMENTS_BUCKET).upload(fileStorageKey, file)`
6. **Marcar versión anterior:** `UPDATE producer_documents SET is_current = false WHERE ... AND is_current = true`
7. **Registrar metadata:** `INSERT INTO producer_documents (...)`

### Subir Documento de UPP

1. **Validar acceso:** `auth.context.canAccessUpp(uppId)`
2. **Obtener producer_id:** Query `SELECT producer_id FROM upps WHERE id = uppId`
3. **Calcular hash:** SHA256
4. **Construir ruta:**
   ```typescript
   const fileStorageKey = `${tenantId}/${producerId}/upp/${uppId}/${documentType}/${Date.now()}_${file.name}`;
   ```
5. **Subir a storage**
6. **Marcar versión anterior:** Por UPP + documentType
7. **Registrar metadata:** `INSERT INTO upp_documents (...)`

### Acceder a Documentos Personales Directamente

Páginas de detalle pueden usar la ruta directa (sin listar):

```typescript
// Acceso directo a ruta conocida
const documentPath = `${tenantId}/${producerId}/personal/${documentType}/`;

// Supabase Storage no lista directorios, pero sí puede servir archivos conocidos
const { data: signed } = await supabaseAdmin.storage
  .from(DOCUMENTS_BUCKET)
  .createSignedUrl(knownFileStorageKey, 60 * 10);
```

---

## Consideraciones de Seguridad

### Row-Level Security (RLS)

- ✅ `producer_documents` — controlado por `auth.uid()` y `tenant_id`
- ✅ `upp_documents` — controlado por validación de `canAccessUpp()`
- ✅ Storage bucket es **privado**, requiere signed URL de 10 minutos

### Aislamiento de Datos

- Cada tenant → su propio directorio en `{tenantId}/`
- Cada productor → su propio subdirectorio `{producerId}/`
- UPPs compartidas entre MVZ y Productor → acceso granular vía `user_upp_access`

### Hash y Integridad

- Cada documento incluye `file_hash` (SHA256)
- Permite detectar corrupción o manipulación
- Útil para auditoría y debugging

---

## Cambios Históricos

### v6 (2026-03-20) — Reestructuración de Rutas

**Antes:**
```
{tenantId}/personal/{producerId}/{type}/{timestamp}_{file}
{tenantId}/upp/{uppId}/{type}/{timestamp}_{file}
```

**Ahora:**
```
{tenantId}/{producerId}/personal/{type}/{timestamp}_{file}
{tenantId}/{producerId}/upp/{uppId}/{type}/{timestamp}_{file}
```

**Motivo:** Agrupar datos por productor primero permite acceso directo a `{tenantId}/{producerId}/personal/` sin listar toda la estructura.

**Impacto:**
- ⚠️ Documentos existentes con rutas antiguas permanecen en storage
- ✅ No se requiere migración de datos (acceso vía DB metadata)
- ✅ Nuevos uploads usan la estructura nueva

---

## Referencias de Código

- **Generación de rutas:** [`ServerProducerDocumentsRepository.ts`](../../src/modules/producer/documents/infra/supabase/ServerProducerDocumentsRepository.ts#L103)
- **Obtención de producer_id para UPPs:** [`ServerUppDocumentsRepository.ts`](../../src/modules/producer/documents/infra/supabase/ServerUppDocumentsRepository.ts#L77)
- **Utilidades compartidas:** [`shared.ts`](../../src/modules/producer/documents/infra/supabase/shared.ts)
- **Handlers HTTP:** [`producerDocumentsHandlers.ts`](../../src/modules/producer/documents/infra/http/producerDocumentsHandlers.ts)
