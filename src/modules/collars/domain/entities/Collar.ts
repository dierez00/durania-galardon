/**
 * Collar Domain Entity
 * Represents an IoT collar with its lifecycle and current state
 */
export interface Collar {
  id: string; // UUID
  tenant_id: string; // UUID
  collar_id: string; // Unique identifier (e.g., "COLLAR-001")
  animal_id: string | null; // UUID of linked animal, null if not assigned
  status: CollarStatus;
  firmware_version: string | null;
  purchased_at: string | null; // ISO8601
  linked_at: string | null; // ISO8601
  unlinked_at: string | null; // ISO8601
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

/**
 * Collar Status - State Machine Values
 */
export type CollarStatus =
  | "inactive" // newly provisioned, unassigned
  | "active" // assigned to producer, ready to assign to animal
  | "linked" // currently linked to an animal
  | "unlinked" // previously linked, now available for reassignment
  | "suspended" // blocked by admin (not usable)
  | "retired"; // end-of-life (permanently unusable)

/**
 * Helper function to validate status transitions
 */
export function isValidStatusTransition(
  currentStatus: CollarStatus,
  newStatus: CollarStatus
): boolean {
  const validTransitions: Record<CollarStatus, CollarStatus[]> = {
    inactive: ["active", "suspended", "retired"],
    active: ["linked", "inactive", "suspended", "retired"],
    linked: ["unlinked", "suspended", "retired"],
    unlinked: ["linked", "suspended", "retired"],
    suspended: ["inactive", "active"],
    retired: [], // final state
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}
