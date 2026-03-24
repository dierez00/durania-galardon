import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import type { AdminMvzAvailableUpp } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export class GetAdminMvzAvailableUppsUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  execute(mvzId: string): Promise<AdminMvzAvailableUpp[]> {
    return this.repo.getAvailableUpps(mvzId);
  }
}
