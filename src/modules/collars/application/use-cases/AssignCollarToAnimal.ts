import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import { collarLinkingService } from "@/modules/collars/domain/services/collarLinkingService";
import type { ProducerAssignCollarDTO } from "../dto/index";

/**
 * Use Case: Producer assigns a collar to an animal
 * Simultaneously updates collar status and creates history entry
 */
export class AssignCollarToAnimal {
  constructor(private repository: ICollarRepository) {}

  async execute(collarId: string, dto: ProducerAssignCollarDTO) {
    // Fetch collar
    const collar = await this.repository.findById(collarId);
    if (!collar) {
      throw new Error(`Collar not found: ${collarId}`);
    }

    // If collar already linked, unlink first
    if (collar.status === "linked" && collar.animal_id && collar.animal_id !== dto.animal_id) {
      const { updatedCollar, historyEntry } = collarLinkingService.unlinkCollarFromAnimal(
        collar,
        dto.linked_by,
        "Auto-unlinked to reassign to different animal"
      );
      await this.repository.updateCollarAnimal(
        collar.id,
        updatedCollar.animal_id,
        updatedCollar.status
      );
      await this.repository.createHistoryEntry(historyEntry);
    }

    // Link to new animal
    const { updatedCollar, historyEntry } = collarLinkingService.linkCollarToAnimal(
      collar,
      dto.animal_id,
      dto.linked_by,
      dto.notes
    );

    // Persist both changes
    await this.repository.updateCollarAnimal(
      collarId,
      updatedCollar.animal_id,
      updatedCollar.status
    );
    const createdHistory = await this.repository.createHistoryEntry(historyEntry);

    return {
      collar: updatedCollar,
      history_entry: createdHistory,
    };
  }
}
