import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";

export class AssignMvzUppUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  execute(mvzId: string, uppId: string): Promise<void> {
    return this.repo.assignUpp(mvzId, uppId);
  }
}
