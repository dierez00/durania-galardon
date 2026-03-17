import type { IAdminExportacionDetailRepository } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { AdminExportacionAnimalDetail } from "../../domain/entities/AdminExportacionAnimalEntity";

export class GetAdminExportacionAnimal {
  constructor(private readonly repository: IAdminExportacionDetailRepository) {}

  async execute(
    exportId: string,
    animalId: string
  ): Promise<AdminExportacionAnimalDetail | null> {
    return this.repository.getAnimalById(exportId, animalId);
  }
}
