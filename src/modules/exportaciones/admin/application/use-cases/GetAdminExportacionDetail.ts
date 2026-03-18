import type { IAdminExportacionDetailRepository } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { AdminExportacionDetallada } from "../../domain/entities/AdminExportacionDetailEntity";

export class GetAdminExportacionDetail {
  constructor(private readonly repository: IAdminExportacionDetailRepository) {}

  async execute(id: string): Promise<AdminExportacionDetallada | null> {
    return this.repository.getById(id);
  }
}
