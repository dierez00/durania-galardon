import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import type { AdminProductorDocument } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export class GetAdminProductorDocumentsUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string): Promise<AdminProductorDocument[]> {
    return this.repo.getDocuments(id);
  }
}
