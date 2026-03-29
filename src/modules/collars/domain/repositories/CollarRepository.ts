import type { Collar, CollarStatus } from "../entities/Collar";
import type { CollarAnimalHistory } from "../entities/CollarAnimalHistory";

export interface CollarFilters {
  status?: string;
  search?: string;
  firmware?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * CollarRepository - Contract for data access
 * Implemented by ServerCollarRepository (Supabase)
 */
export interface ICollarRepository {
  /**
   * Find a collar by UUID
   */
  findById(collarId: string): Promise<Collar | null>;

  /**
   * Find a collar by collar_id (unique business identifier)
   */
  findByCollarId(collarId: string): Promise<Collar | null>;

  /**
   * Find unassigned collars for a tenant
   * Status must be one of: "active", "unlinked"
   */
  findUnassignedByTenant(limit?: number): Promise<Collar[]>;

  /**
   * Find ALL collars for a tenant (assigned and unassigned) with pagination and optional filters
   */
  findByTenant(
    limit: number,
    offset: number,
    filters?: CollarFilters
  ): Promise<{ collars: Collar[]; total: number; limit: number; offset: number }>;

  /**
   * Find all collars matching optional filters
   */
  findByStatus(status: CollarStatus, limit?: number): Promise<Collar[]>;

  /**
   * Create a new collar (typically in "inactive" status)
   */
  create(collar: Omit<Collar, "id" | "created_at" | "updated_at">): Promise<Collar>;

  /**
   * Update collar status with timestamp
   */
  updateCollarStatus(
    collarId: string,
    newStatus: CollarStatus,
    linkedAt?: string | null,
    unlinkedAt?: string | null
  ): Promise<Collar>;

  /**
   * Update collar animal link (for assign/unassign operations)
   */
  updateCollarAnimal(
    collarId: string,
    animalId: string | null,
    newStatus: CollarStatus
  ): Promise<Collar>;

  /**
   * Create history entry for link/unlink operation
   */
  createHistoryEntry(history: Omit<CollarAnimalHistory, "id">): Promise<CollarAnimalHistory>;

  /**
   * Get history entries for a collar
   */
  getHistoryByCollarId(collarId: string): Promise<CollarAnimalHistory[]>;

  /**
   * Save changes to a collar (generic update)
   */
  save(collar: Collar): Promise<Collar>;
}
