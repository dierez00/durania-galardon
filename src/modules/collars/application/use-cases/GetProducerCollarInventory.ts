import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import type { Collar } from "@/modules/collars/domain/entities/Collar";

/**
 * Use Case: Get producer's unassigned collar inventory
 */
export class GetProducerCollarInventory {
  constructor(private repository: ICollarRepository) {}

  async execute(): Promise<Collar[]> {
    // Get collars that are not currently linked to animals
    const collars = await this.repository.findUnassignedByTenant(100);
    return collars;
  }
}
