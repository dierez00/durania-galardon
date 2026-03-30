import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import type { CollarAnimalHistory } from "@/modules/collars/domain/entities/CollarAnimalHistory";

/**
 * Use Case: Get complete history/audit trail for a collar
 */
export class ListCollarHistory {
  constructor(private repository: ICollarRepository) {}

  async execute(collarId: string): Promise<CollarAnimalHistory[]> {
    const history = await this.repository.getHistoryByCollarId(collarId);
    return history;
  }
}
