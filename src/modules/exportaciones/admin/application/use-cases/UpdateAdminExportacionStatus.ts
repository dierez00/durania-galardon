import type { IAdminExportacionDetailRepository } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { UpdateAdminExportacionStatusDTO } from "../dto/UpdateAdminExportacionStatusDTO";

export class UpdateAdminExportacionStatus {
  constructor(private readonly repository: IAdminExportacionDetailRepository) {}

  async execute(id: string, dto: UpdateAdminExportacionStatusDTO): Promise<void> {
    return this.repository.updateStatus({
      id,
      status: dto.status,
      blockedReason: dto.blockedReason,
      complianceRule60: dto.complianceRule60,
      tbBrValidated: dto.tbBrValidated,
      blueTagAssigned: dto.blueTagAssigned,
    });
  }
}
