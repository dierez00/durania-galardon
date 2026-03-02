import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import type { AdminMvzUpp } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export class GetAdminMvzUppsUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string): Promise<AdminMvzUpp[]> {
    return this.repo.getUpps(id);
  }
}
