import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import type { AdminMvzTest } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export class GetAdminMvzTestsUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string): Promise<AdminMvzTest[]> {
    return this.repo.getTests(id);
  }
}
