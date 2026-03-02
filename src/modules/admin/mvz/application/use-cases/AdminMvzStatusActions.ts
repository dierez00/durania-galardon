import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";

export class UpdateAdminMvzStatusUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string, status: "active" | "inactive"): Promise<void> {
    return this.repo.updateStatus(id, status);
  }
}

export class DeleteAdminMvzUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.deleteMvz(id);
  }
}
