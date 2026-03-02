import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import type { AdminProductorDetallado } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export class GetAdminProductorDetailUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string): Promise<AdminProductorDetallado | null> {
    return this.repo.getById(id);
  }
}
