import type { IAdminExportacionDetailRepository } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { AdminExportacionAnimal } from "../../domain/entities/AdminExportacionAnimalEntity";

export class GetAdminExportacionAnimales {
  constructor(private readonly repository: IAdminExportacionDetailRepository) {}

  async execute(exportId: string): Promise<AdminExportacionAnimal[]> {
    return this.repository.getAnimales(exportId);
  }
}
