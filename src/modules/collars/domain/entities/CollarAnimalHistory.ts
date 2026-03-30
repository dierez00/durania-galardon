/**
 * Collar Animal History - Audit Trail Entry
 * Records every link/unlink operation for trazabilidad
 */
export interface CollarAnimalHistory {
  id: string; // UUID
  collar_id_fk: string; // UUID of collar
  animal_id: string; // UUID of animal
  tenant_id: string; // UUID for tenant isolation
  linked_by: string | null; // UUID of profile who linked
  unlinked_by: string | null; // UUID of profile who unlinked
  linked_at: string; // ISO8601
  unlinked_at: string | null; // ISO8601
  notes: string | null; // Optional context/reason
}
