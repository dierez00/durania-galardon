import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import type { AdminMvzVisitsPaginated } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export class GetAdminMvzVisitsUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string, page: number): Promise<AdminMvzVisitsPaginated> {
    return this.repo.getVisits(id, page);
  }
}
