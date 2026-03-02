import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";

export class UnassignMvzUppUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  execute(mvzId: string, uppId: string): Promise<void> {
    return this.repo.unassignUpp(mvzId, uppId);
  }
}
