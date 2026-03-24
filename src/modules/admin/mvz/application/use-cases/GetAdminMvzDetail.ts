import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import type { AdminMvzDetallado } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export class GetAdminMvzDetailUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string): Promise<AdminMvzDetallado | null> {
    return this.repo.getById(id);
  }
}
