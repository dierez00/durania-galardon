import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";

export class UpdateAdminProductorStatusUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string, status: "active" | "inactive"): Promise<void> {
    return this.repo.updateStatus(id, status);
  }
}

export class DeleteAdminProductorUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.deleteProductor(id);
  }
}
