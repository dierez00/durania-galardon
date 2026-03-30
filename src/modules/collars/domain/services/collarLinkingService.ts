import type { Collar, CollarStatus } from "../entities/Collar";
import { isValidStatusTransition } from "../entities/Collar";
import type { CollarAnimalHistory } from "../entities/CollarAnimalHistory";

/**
 * Domain Service for Collar Linking Logic
 * Encapsulates business rules for collar-animal associations
 */
export class CollarLinkingService {
  /**
   * Validate and prepare linking a collar to an animal
   * Returns the history entry to be persisted
   */
  linkCollarToAnimal(
    collar: Collar,
    animalId: string,
    linkedById: string,
    notes?: string
  ): { updatedCollar: Collar; historyEntry: Omit<CollarAnimalHistory, "id"> } {
    // Validate current status allows linking
    if (!isValidStatusTransition(collar.status, "linked")) {
      throw new Error(
        `Cannot link collar in status '${collar.status}'. Must be 'active' or 'unlinked'.`
      );
    }

    const now = new Date().toISOString();

    const updatedCollar: Collar = {
      ...collar,
      status: "linked",
      animal_id: animalId,
      linked_at: now,
      unlinked_at: null,
      updated_at: now,
    };

    const historyEntry: Omit<CollarAnimalHistory, "id"> = {
      collar_id_fk: collar.id,
      animal_id: animalId,
      tenant_id: collar.tenant_id,
      linked_by: linkedById,
      unlinked_by: null,
      linked_at: now,
      unlinked_at: null,
      notes: notes || null,
    };

    return { updatedCollar, historyEntry };
  }

  /**
   * Validate and prepare unlinking a collar from an animal
   */
  unlinkCollarFromAnimal(
    collar: Collar,
    unlinkedById: string,
    notes?: string
  ): { updatedCollar: Collar; historyEntry: Omit<CollarAnimalHistory, "id"> } {
    // Validate current status allows unlinking
    if (collar.status !== "linked") {
      throw new Error(`Can only unlink collars that are 'linked'. Current status: '${collar.status}'`);
    }

    const now = new Date().toISOString();

    const updatedCollar: Collar = {
      ...collar,
      status: "unlinked",
      animal_id: null,
      unlinked_at: now,
      updated_at: now,
    };

    const historyEntry: Omit<CollarAnimalHistory, "id"> = {
      collar_id_fk: collar.id,
      animal_id: collar.animal_id || "", // Keep record of what was unlinked
      tenant_id: collar.tenant_id,
      linked_by: null,
      unlinked_by: unlinkedById,
      linked_at: collar.linked_at || now,
      unlinked_at: now,
      notes: notes || null,
    };

    return { updatedCollar, historyEntry };
  }

  /**
   * Validate status change for administrative operations
   */
  validateStatusChange(
    currentStatus: CollarStatus,
    newStatus: CollarStatus
  ): { valid: boolean; message?: string } {
    if (currentStatus === newStatus) {
      return { valid: false, message: "Collar is already in this status" };
    }

    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return {
        valid: false,
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const collarLinkingService = new CollarLinkingService();
