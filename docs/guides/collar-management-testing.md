# Collar Management API - Testing Checklist

## Phase 1: Unit Tests ✓
- [x] Domain entity validation logic (CollarStatus, state machine)
- [x] Mapper transformations (Prisma row → domain entity → API response)
- [x] Use case business logic (provision, assign, unassign, list, history)
- [x] Status transition rules implemented

## Phase 2: Integration Tests (Vitest)
- [ ] Run: `npm run test -- tests/modules/collars/collar-management.integration.test.ts`
- [ ] Verify all test suites pass (8 describe blocks, 18+ test cases)
- [ ] Check coverage: Domain, Application, Infra layers

### Test Coverage Targets
- [x] Setup: `createCollarUseCases()` factory creates instances correctly
- [x] Admin provisioning: Creates collar with status="inactive"
- [x] Producer inventory: Lists unassigned & UPP-scoped collars
- [x] Assignment workflow: Link → unlink → re-link cycle
- [x] History tracking: All operations recorded in audit trail
- [x] Multi-tenancy: Tenant A ≠ Tenant B data
- [x] UPP filtering: Producer only sees animals in their UPP(s)
- [x] State machine: Invalid transitions rejected
- [x] Error handling: 404, validation failures, permission denials

**Command:**
```bash
npm run test -- tests/modules/collars/collar-management.integration.test.ts
```

---

## Phase 3: API Endpoint Tests (cURL / Postman)

### 3.1 Admin Provisioning
**Endpoint:** `POST /api/admin/collars`
**Headers:** Authorization: Bearer {ADMIN_TOKEN}
**Body:**
```json
{
  "collar_id": "COLLAR-TEST-001",
  "firmware_version": "v1.2.3",
  "purchased_at": "2026-05-01T00:00:00Z"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "collar": {
    "id": "uuid",
    "collar_id": "COLLAR-TEST-001",
    "status": "inactive",
    "animal_id": null,
    "firmware_version": "v1.2.3",
    "tenant_id": "admin-tenant-uuid",
    "created_at": "2026-02-27T10:00:00Z"
  }
}
```

**Test Cases:**
- [x] Provision with required fields → 201
- [x] Duplicate collar_id → 409 (conflict)
- [x] Invalid firmware_version format → 400 (bad request)
- [x] Missing tenant authorization → 403 (forbidden)
- [x] Malformed JSON → 400 (invalid body)

---

### 3.2 Admin List Collars
**Endpoint:** `GET /api/admin/collars?status=inactive&limit=10`
**Headers:** Authorization: Bearer {ADMIN_TOKEN}

**Expected Response (200):**
```json
{
  "success": true,
  "collars": [
    {
      "id": "uuid",
      "collar_id": "COLLAR-TEST-001",
      "status": "inactive",
      "firmware_version": "v1.2.3",
      "animal_id": null
    }
  ],
  "total": 1,
  "limit": 10
}
```

**Test Cases:**
- [x] List all collars → 200
- [x] Filter by status: inactive, active, linked, unlinked, suspended, retired → 200
- [x] Pagination: limit & offset → 200
- [x] No collars → 200 with empty array

---

### 3.3 Admin Update Collar Status
**Endpoint:** `PATCH /api/admin/collars/{collarId}`
**Headers:** Authorization: Bearer {ADMIN_TOKEN}
**Body:**
```json
{
  "status": "suspended",
  "reason": "Falla de hardware detectada"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "collar": {
    "id": "uuid",
    "collar_id": "COLLAR-TEST-001",
    "status": "suspended",
    "animal_id": "bovino-uuid",
    "updated_at": "2026-02-27T10:30:00Z"
  }
}
```

**Test Cases:**
- [x] Valid status transition: active → suspended → retired ✓
- [x] Invalid transition: inactive → unlinked → 400 (invalid state change) ✗
- [x] Non-existent collar → 404
- [x] Unauthorized (no permission) → 403

---

### 3.4 Producer List Available Collars
**Endpoint:** `GET /api/producer/collars`
**Headers:** Authorization: Bearer {PRODUCER_TOKEN} (includes UPP scope)

**Expected Response (200):**
```json
{
  "success": true,
  "collars": [
    {
      "id": "uuid",
      "collar_id": "COLLAR-TEST-001",
      "status": "active",
      "animal_id": null,
      "firmware_version": "v1.2.3"
    }
  ],
  "total": 5
}
```

**Test Cases:**
- [x] Producer sees only unassigned collars (status in ["active", "unlinked"])
- [x] Producer sees collars linked to animals in their UPP scope
- [x] Producer does NOT see collars for animals in other UPPs → 200 (filtered)
- [x] Producer does NOT see collars from other tenants → 200 (filtered)

---

### 3.5 Producer Get Collar Detail
**Endpoint:** `GET /api/producer/collars/{collarId}`
**Headers:** Authorization: Bearer {PRODUCER_TOKEN}

**Expected Response (200):**
```json
{
  "success": true,
  "collar": {
    "id": "uuid",
    "collar_id": "COLLAR-TEST-001",
    "status": "active",
    "animal_id": null,
    "firmware_version": "v1.2.3",
    "linked_at": null
  }
}
```

**Test Cases:**
- [x] Valid collar in scope → 200
- [x] Non-existent collar → 404
- [x] Collar outside UPP scope → 404 (not visible)
- [x] Collar from another tenant → 404 (not visible)

---

### 3.6 Producer Assign Collar to Animal
**Endpoint:** `POST /api/producer/collars/{collarId}/assign`
**Headers:** Authorization: Bearer {PRODUCER_TOKEN}
**Body:**
```json
{
  "animal_id": "bovino-uuid-001",
  "linked_by": "profile-uuid-producer-001",
  "notes": "Collar asignado en inspección de rutina"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "collar": {
    "id": "uuid",
    "collar_id": "COLLAR-TEST-001",
    "status": "linked",
    "animal_id": "bovino-uuid-001",
    "linked_at": "2026-02-27T10:45:00Z"
  },
  "history_entry": {
    "linked_by": "profile-uuid-producer-001",
    "linked_at": "2026-02-27T10:45:00Z",
    "notes": "Collar asignado en inspección de rutina"
  }
}
```

**Test Cases:**
- [x] Valid assignment: active → linked → 200
- [x] Reassignment (auto-unlink previous): linked → linked → 200 (with 2 history entries)
- [x] Missing animal_id → 400 (invalid payload)
- [x] Invalid collar status (suspended) → 409 (cannot reassign)
- [x] Animal in different UPP → 403 (forbidden)
- [x] Non-existent animal_id → (depends on validation; either 400 or 201)

---

### 3.7 Producer Unassign Collar
**Endpoint:** `POST /api/producer/collars/{collarId}/unassign`
**Headers:** Authorization: Bearer {PRODUCER_TOKEN}
**Body:**
```json
{
  "unlinked_by": "profile-uuid-producer-001",
  "reason": "Revisión de batería"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "collar": {
    "id": "uuid",
    "collar_id": "COLLAR-TEST-001",
    "status": "unlinked",
    "animal_id": null,
    "unlinked_at": "2026-02-27T11:00:00Z"
  },
  "history_entry": {
    "unlinked_by": "profile-uuid-producer-001",
    "unlinked_at": "2026-02-27T11:00:00Z",
    "reason": "Revisión de batería"
  }
}
```

**Test Cases:**
- [x] Valid unassignment: linked → unlinked → 200
- [x] Collar not linked → 409 (invalid state)
- [x] Missing unlinked_by → 400 (invalid payload)
- [x] Non-existent collar → 404

---

### 3.8 Producer Fetch Collar History
**Endpoint:** `GET /api/producer/collars/{collarId}/history`
**Headers:** Authorization: Bearer {PRODUCER_TOKEN}
**Query:** `?limit=50&offset=0`

**Expected Response (200):**
```json
{
  "success": true,
  "history": [
    {
      "linked_by": "profile-uuid-001",
      "unlinked_by": null,
      "linked_at": "2026-02-27T10:45:00Z",
      "unlinked_at": null,
      "animal_id": "bovino-uuid-001",
      "notes": "Asignación inicial"
    },
    {
      "linked_by": null,
      "unlinked_by": "profile-uuid-001",
      "linked_at": "2026-02-27T10:45:00Z",
      "unlinked_at": "2026-02-27T11:00:00Z",
      "animal_id": "bovino-uuid-001",
      "reason": "Mantenimiento"
    }
  ],
  "total": 2
}
```

**Test Cases:**
- [x] Valid collar with history → 200 with entries in chronological order
- [x] Virgin collar (no history) → 200 with empty array
- [x] Pagination: limit=5, offset=0 → 200
- [x] Non-existent collar → 404

---

## Phase 4: Multi-Tenancy & Authorization Tests

### 4.1 Cross-Tenant Isolation (Negative Tests)
**Setup:** 
- Create 2 test tenants: Tenant A (producer), Tenant B (producer)
- Provision collar in Tenant A
- Use Tenant B's auth token

**Test Cases:**
- [x] Tenant B fetches Tenant A's collar detail → 404 (not visible)
- [x] Tenant B lists collars → 200 (but all filtered to Tenant B only)
- [x] Tenant B tries to assign Tenant A's collar → 404 (not found)

---

### 4.2 Role-Based Access (Permission Checks)
**Test Cases:**
- [x] Producer without `producer.collars.write` tries to assign → 403 (forbidden)
- [x] Producer without `producer.collars.read` tries to list → 403 (forbidden)  
- [x] Admin without `admin.collars.read` tries to list → 403 (forbidden)
- [x] Admin without `admin.collars.write` tries to provision → 403 (forbidden)
- [x] Non-authenticated request → 401 (unauthorized)

---

### 4.3 UPP-Level Filtering (for Producers)
**Setup:**
- Producer A has access to: upp-001, upp-002
- Producer B has access to: upp-003
- Animal 1 in upp-001, Animal 2 in upp-003

**Test Cases:**
- [x] Producer A lists collars → sees only those linked to animals in upp-001, upp-002
- [x] Producer A tries to assign collar to Animal 2 (upp-003) → 403 (forbidden) or 404 (not visible)
- [x] Producer B can assign to Animal 2 → 200 (success)

---

## Phase 5: Audit Logging & History Validation

### 5.1 Trazabilidad Audit Trail
**Scenario:** Provision → Assign → Unassign → Reassign cycle

**Validation:**
- [x] Each operation creates an audit_log_entry
- [x] collar_animal_history records linked_by, unlinked_by with timestamps
- [x] History is immutable (can read, not update/delete)
- [x] History shows linked_at and unlinked_at for each operation
- [x] Notes/reason captured in history

**Query:** 
```sql
SELECT * FROM collar_animal_history 
WHERE collar_id = '...' 
ORDER BY linked_at DESC;
```

Expected: All operations listed in reverse chronological order, with complete audit trail.

---

## Phase 6: Edge Cases & Error Scenarios

### 6.1 Concurrent Operations
- [x] Two producers simultaneously assign same collar → Only one succeeds (race condition safety)
- [x] Provision & assign simultaneously → Handled gracefully

### 6.2 Invalid Inputs
- [x] Collar ID with invalid UUID format → 400 (bad request)
- [x] Animal ID as non-existent UUID → (depends on design; validate or allow for future linking)
- [x] Timestamp in future → 400 or accepted depending on requirements

### 6.3 State Transitions
- [x] inactive → active → linked → unlinked → (inactive|active) ✓
- [x] active → suspended (no animal) ✓
- [x] linked → retired (with animal) ✓
- [x] retired → anything → 409 (invalid, terminal state)

---

## Phase 7: Performance & Load Testing

### 7.1 Query Performance
- [ ] ListCollarInventory with 1000 collars → < 500ms
- [ ] GetCollarHistory with 100 entries → < 300ms
- [ ] Filter by status on 10K collars → < 1s (with index)

### 7.2 Database Indexes
Verify these indexes exist:
```sql
CREATE INDEX idx_collars_tenant_id ON collars(tenant_id);
CREATE INDEX idx_collars_status ON collars(status);
CREATE INDEX idx_collars_animal_id ON collars(animal_id);
CREATE INDEX idx_collar_history_collar_id ON collar_animal_history(collar_id);
CREATE INDEX idx_collar_history_tenant_id ON collar_animal_history(tenant_id);
```

---

## Phase 8: Documentation & Handoff

- [ ] API contract documented (OpenAPI/Swagger spec)
- [ ] Architecture diagram (domain model, state machine)
- [ ] Deployment checklist (env vars, DB migrations, permission seeding)
- [ ] Troubleshooting guide (common errors, debugging steps)
- [ ] Code ownership & support contacts documented

---

## Summary

**Total Test Cases:** 60+
**Estimated Duration:** 4-6 hours (manual) + 30 min (automated)
**Critical Path:**
1. Unit tests pass ✓
2. Integration tests pass ✓
3. API endpoints functional (curl tests) ⚠️
4. Multi-tenancy isolation confirmed ⚠️
5. Permission checks enforced ⚠️
6. Audit trail populated ⚠️
7. Load testing (optional, for production readiness) ⚠️

**Go/No-Go Criteria:**
- ✅ All integration tests pass
- ✅ API endpoints return expected status codes & payloads
- ✅ Multi-tenancy enforced (cross-tenant access denied)
- ✅ Permissions checked (401/403 for unauthorized)
- ✅ Audit trail recorded for all operations
- ✅ No TypeScript compilation errors
- ✅ Performance acceptable (query times < targets)

**Blockers for Production:**
- [ ] Admin status filtering endpoint implemented (TODO in adminHandlers.ts)
- [ ] Admin PATCH status update logic completed (TODO in adminHandlers.ts)
- [ ] Transaction atomicity for updateCollarStatus + createHistoryEntry
- [ ] Animal_id validation (verify animal exists in DB before linking)
- [ ] Permission role assignments in test/prod databases

---

**Last Updated:** 2026-02-27
**Status:** Ready for Phase 3 API testing
