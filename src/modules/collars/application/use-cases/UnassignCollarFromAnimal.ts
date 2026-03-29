import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import { collarLinkingService } from "@/modules/collars/domain/services/collarLinkingService";
import type { ProducerUnassignCollarDTO } from "../dto/index";

/**
 * Use Case: Producer unassigns a collar from an animal
 */
export class UnassignCollarFromAnimal {
  constructor(private repository: ICollarRepository) {}

  async execute(collarId: string, dto: ProducerUnassignCollarDTO) {
    // Fetch collar
    const collar = await this.repository.findById(collarId);
    if (!collar) {
      throw new Error(`Collar not found: ${collarId}`);
    }

    if (collar.status !== "linked") {
      throw new Error(
        `Can only unassign collars that are linked. Current status: '${collar.status}'`
      );
    }

    // Unlink
    const { updatedCollar, historyEntry } = collarLinkingService.unlinkCollarFromAnimal(
      collar,
      dto.unlinked_by,
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
