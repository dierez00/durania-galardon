import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import type { AdminProductorUpp } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export class GetAdminProductorUppsUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string): Promise<AdminProductorUpp[]> {
    return this.repo.getUpps(id);
  }
}
