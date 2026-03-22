# Document Hierarchy Architecture

**Status**: Active  
**Owner**: Engineering  
**Last Updated**: 2026-03-22  
**Related**: [Producer Documents Module](../../src/modules/producer/documents/)

## Overview

The document management system in Durania distinguishes between **two hierarchical levels**:

1. **Producer-level documents** (Documentos Personales) — Organizational credentials
2. **Project-level documents** (Documentos del Proyecto) — Rancho/UPP-specific credentials

The system uses **separate database tables** and **separate UI contexts** to maintain clear boundaries between organizational and project-scoped data.

---

## Document Classification

### Producer Personal Documents (Tabla: `producer_documents`)

These documents belong to the **producer organization** and are shared across all projects.

| Document | Key | Expiry Required | Calculation | Status |
|----------|-----|-----------------|-------------|--------|
| **INE (Cédula)** | `ine` | ✅ Yes | Manual (user provides date) | Active |
| **CURP** | `curp` | ❌ No | Never expires | Active |
| **Comprobante de Domicilio** | `comprobante_domicilio` | ✅ Yes | Automatic (from issue date) | Active |

**Key Properties:**
- Linked to `producer_id` (not UPP-specific)
- Shared across all ranches belonging to the producer
- Required for producer organizational validation

---

### Project Documents (Tabla: `upp_documents`)

These documents belong to a **specific project** (Unidad de Producción Pecuaria / Rancho).

| Document | Key | Expiry Required | Calculation | Status |
|----------|-----|-----------------|-------------|--------|
| **Escritura del Rancho** | `escritura_rancho` | ❌ No | N/A (permanent) | Active |
| **Constancia de la UPP** | `constancia_upp` | ✅ Yes | Manual (user provides date) | Active |

**Key Properties:**
- Linked to `upp_id` (project-specific)
- Each rancho has its own set
- Specific to each project's legal/regulatory requirements

---

## Database Schema

### `producer_documents`

```sql
CREATE TABLE producer_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  producer_id UUID NOT NULL REFERENCES producers(id),
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  file_storage_key TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'validated', 'expired', 'rejected')),
  comments TEXT,
  is_current BOOLEAN DEFAULT false,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique: Only one current document per producer per type
  UNIQUE (producer_id, document_type_id) WHERE is_current = true
);

CREATE INDEX idx_producer_documents_producer_id ON producer_documents(producer_id);
CREATE INDEX idx_producer_documents_status ON producer_documents(status);
```

### `upp_documents`

```sql
CREATE TABLE upp_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  upp_id UUID NOT NULL REFERENCES upps(id),
  document_type TEXT NOT NULL, -- Free text (not FK)
  file_storage_key TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'validated', 'expired', 'rejected')),
  comments TEXT,
  is_current BOOLEAN DEFAULT false,
  expiry_date DATE,
  uploaded_by_user_id UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique: Only one current document per project per type
  UNIQUE (upp_id, document_type) WHERE is_current = true
);

CREATE INDEX idx_upp_documents_upp_id ON upp_documents(upp_id);
CREATE INDEX idx_upp_documents_status ON upp_documents(status);
```

**Key Difference**: `producer_documents` uses a **FK to `document_types`**, while `upp_documents` uses **free text `document_type`** for flexibility.

**Comments Policy**:
- `comments` can only be updated by admin/government workflows.
- Producer panel consumes comments as read-only feedback for rejection and validity guidance.

---

## UI Rendering Context

### Route: `/producer/settings`

**Scope**: `"personal"`

Shows only **producer-level documents**:

```
┌─────────────────────────────────┐
│ Documentos del Productor        │
├─────────────────────────────────┤
│ [Upload Widget: Personal Only]  │
├─────────────────────────────────┤
│ ✓ INE (Válido)                  │
│ ⏰ CURP (No vence)              │
│ ⚠ Comprobante (Vence 2025-12-31)│
└─────────────────────────────────┘
```

---

### Route: `/producer/projects/[uppId]/documentos`

**Scope**: `"mixed"`

Shows **both personal and project documents** in separate tabs:

```
┌──────────────────────────────────────────────────────┐
│ Documentos: [Rancho Name]                            │
├──────────────────────────────────────────────────────┤
│ [Upload Widget: Auto-detects type → endpoint]        │
├──────────────────────────────────────────────────────┤
│  [Documentos Personales] [Documentos del Proyecto]   │
│  ┌────────────────────┐ ┌────────────────────────┐  │
│  │ ✓ INE              │ │ ✓ Escritura            │  │
│  │ ⏰ CURP           │ │ ⚠ Constancia (Vence)  │  │
│  │ ⚠ Comprobante     │ │                        │  │
│  └────────────────────┘ └────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

### Route: `/producer/documentos` (Dashboard)

**Scope**: `"all"` (Reserved for future use)

Renders both tabs for comprehensive view of all documents.

---

## API Endpoints

### Personal Documents

**GET** `/api/producer/documents`

Fetches producer-level documents.

```typescript
Query: SELECT * FROM producer_documents
       WHERE tenant_id = user.tenantId 
       AND producer_id = {producerId}
       ORDER BY uploaded_at DESC
```

**POST** `/api/producer/documents`

Uploads a personal document.

```typescript
Body (multipart/form-data):
  - file: File (PDF/JPG)
  - documentTypeKey: "ine" | "curp" | "comprobante_domicilio"
  - expiryDate?: "YYYY-MM-DD" (required for some types)
```

---

### Project Documents

**GET** `/api/producer/upp-documents?uppId=[id]`

Fetches project-level documents for accessible UPPs.

```typescript
Query: SELECT * FROM upp_documents
       WHERE tenant_id = user.tenantId 
       AND upp_id IN ({accessibleUppIds})
       ORDER BY uploaded_at DESC
```

**POST** `/api/producer/upp-documents`

Uploads a project document.

```typescript
Body (multipart/form-data):
  - file: File (PDF/JPG)
  - uppId: "uuid-rancho" (required)
  - documentType: "escritura_rancho" | "constancia_upp"
  - expiryDate?: "YYYY-MM-DD" (required for some types)
```

---

## Upload Widget Behavior

The **DocumentUploadCard** component intelligently routes uploads:

| Scope | Rendering | Detection |
|-------|-----------|-----------|
| `"personal"` | Single field (personal only) | Auto-routes to `/api/producer/documents` |
| `"upp"` | Single field (project only) + UPP selector | Auto-routes to `/api/producer/upp-documents` |
| `"mixed"` | Tabs: "Personales" \| "Proyecto" | User selects tab → Auto-routes to correct endpoint |
| `"all"` | Tabs: "Personales" \| "Ranchos" | User selects tab → Auto-routes to correct endpoint |

**Key Feature**: The widget automatically determines the destination API endpoint based on the selected document type and scope.

---

## Progress Calculation

The **DocumentProgressIndicator** shows unified progress across both document levels:

```
Completitud: [████████░░░░]  66%

Completados: 2        En revisión: 1
Pendientes:  0        Vencidos: 0
Rechazados:  0

Documentos Requeridos:
  ✓ INE (Personal)
  ⏰ CURP (Personal) — En revisión
  ○ Comprobante (Personal) — Pendiente
  ✓ Escritura (Rancho X)
  ⚠ Constancia UPP (Rancho X) — Vencida
```

**Calculation**: 
- **Personal baseline**: 3 required documents (INE + CURP + Comprobante)
- **Per-project baseline**: 2 required documents (Escritura + Constancia)
- **Total for scope="mixed"**: 3 + 2 = 5 documents (when viewing one project)

---

## Security & Access Control

### Authentication
- All endpoints require `producer.documents.read` or `producer.documents.write` permissions
- User must have at least `"producer"` or `"employee"` role

### Data Isolation
- **Tenant-level**: Documents filtered by `tenant_id`
- **Producer-level**: Personal documents filtered by associated `producer_id`
- **Project-level**: Project documents filtered by accessible `upp_id` list (user must have project access)

### RLS Policies
- PostgreSQL RLS enforces tenant isolation
- Producer documents are scoped to user's tenant
- Project documents are scoped to accessible projects

---

## Implementation Details

### Component: `ProducerDocumentosPage`

Main presentation component that orchestrates document display.

**Props:**
```typescript
interface ProducerDocumentosPageProps {
  scope?: "all" | "personal" | "upp" | "mixed";
  title?: string;
  description?: string;
}
```

**Scope Logic:**
- `"personal"`: Shows only producer docs, hides project docs
- `"upp"`: Shows only project docs, hides producer docs
- `"mixed"`: Shows both, organized in tabs (new in v2.1)
- `"all"`: Shows both in unified list (dashboard view)

**Hooks used:**
- `useProducerDocuments()` — Loads from `/api/producer/documents`
- `useUppDocuments(uppId)` — Loads from `/api/producer/upp-documents`
- `useDocumentProgress()` — Calculates progress across levels
- `useProducerUppContext()` — Gets selected project

---

### Component: `DocumentUploadCard`

Intelligent upload widget supporting multiple modes.

**Supported Formats:**
- PDF, JPG, JPEG only
- Max size: Enforced by Supabase storage config
- Drag-and-drop support

**Validation:**
- Only allows document types valid for current scope
- Validates date fields based on document type
- Client-side hash calculation for integrity

---

## Future Extensions

### Planned Documents (Out of scope for v2.1)

| Document | Level | Status |
|----------|-------|--------|
| Licencia Veterinaria | Personal | Planned |
| Certificados de Ganado | Project | Planned |
| Registros Zoosanitarios | Project | Planned |

**To add a new document type:**

1. Update the document type constant in appropriate entity file:
   - Personal: [ProducerDocumentEntity.ts](../../src/modules/producer/documents/domain/entities/ProducerDocumentEntity.ts)
   - Project: [UppDocumentEntity.ts](../../src/modules/producer/documents/domain/entities/UppDocumentEntity.ts)

2. Add to the type array:
   ```typescript
   export const PRODUCER_PERSONAL_DOCUMENT_TYPES = [
     // ... existing types ...
     {
       key: "licencia_veterinaria",
       name: "Licencia Veterinaria",
       requiresExpiry: true,
       issueDateBased: false
     }
   ] as const;
   ```

3. **No database migration needed** — Types are managed in code constants.

---

## Related Files

- **Presentation**: [src/modules/producer/documents/presentation/](../../src/modules/producer/documents/presentation/)
- **Domain Entities**: [src/modules/producer/documents/domain/entities/](../../src/modules/producer/documents/domain/entities/)
- **Use Cases**: [src/modules/producer/documents/application/use-cases/](../../src/modules/producer/documents/application/use-cases/)
- **API Handlers**: [src/modules/producer/documents/infra/http/](../../src/modules/producer/documents/infra/http/)
- **Supabase Integration**: [src/modules/producer/documents/infra/supabase/](../../src/modules/producer/documents/infra/supabase/)

---

## Changelog

### v2.1 (2026-03-22)
- ✨ Added `scope="mixed"` for combined personal + project views
- 🎨 Integrated Tabs UI for organized document presentation
- 📝 Created this document hierarchy specification
- 🔄 Auto-routing upload widget to correct endpoint by document type

### v2.0
- Initial document management system
- Personal documents in `producer_documents`
- Project documents in `upp_documents`
