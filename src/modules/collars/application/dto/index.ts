/**
 * DTO for Admin Provisioning (registering a new collar)
 */
export interface AdminProvisionCollarDTO {
  collar_id: string; // Unique ID like "COLLAR-001"
  firmware_version?: string;
  purchased_at?: string; // ISO8601
  tenant_id?: string; // Optional, defaults to current tenant
  producer_id?: string; // Optional producer to assign collar to
}

/**
 * DTO for Producer Assignment
 */
export interface ProducerAssignCollarDTO {
  animal_id: string; // UUID of animal to link to
  linked_by: string; // UUID of profile (actor) performing the action
  notes?: string; // Optional notes for this link
}

/**
 * DTO for Producer Unassignment
 */
export interface ProducerUnassignCollarDTO {
  unlinked_by: string; // UUID of profile (actor) performing the action
  notes?: string; // Optional notes for unassignment
}

/**
 * DTO for updating collar status (admin)
 */
export interface AdminUpdateCollarStatusDTO {
  status: "suspended" | "retired";
  notes?: string; // Optional notes for status change
}

export type AdminEditableCollarStatus = "inactive" | "active" | "suspended" | "retired";

export interface AdminUpdateCollarDTO {
  collar_id?: string;
  status?: AdminEditableCollarStatus;
  producer_id?: string | null;
  purchased_at?: string;
  notes?: string;
}

/**
 * Standard Response DTO
 */
export interface CollarResponseDTO {
  id: string;
  collar_id: string;
  status: string;
  animal_id: string | null;
  firmware_version: string | null;
  purchased_at: string | null;
  linked_at: string | null;
  unlinked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * History Entry Response DTO
 */
export interface CollarHistoryResponseDTO {
  id: string;
  collar_id_fk: string;
  animal_id: string;
  linked_by: string | null;
  unlinked_by: string | null;
  linked_at: string;
  unlinked_at: string | null;
  notes: string | null;
}
