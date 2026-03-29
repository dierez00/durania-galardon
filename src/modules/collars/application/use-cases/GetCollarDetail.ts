import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import type { Collar } from "@/modules/collars/domain/entities/Collar";

/**
 * Use Case: Get collar detail (includes current state)
 */
export class GetCollarDetail {
  constructor(private repository: ICollarRepository) {}

  async execute(collarId: string): Promise<Collar | null> {
    const collar = await this.repository.findById(collarId);
    return collar;
  }
}
