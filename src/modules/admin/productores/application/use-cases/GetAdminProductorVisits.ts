import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import type { AdminProductorVisitsPaginated } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export class GetAdminProductorVisitsUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string, page: number): Promise<AdminProductorVisitsPaginated> {
    return this.repo.getVisits(id, page);
  }
}
