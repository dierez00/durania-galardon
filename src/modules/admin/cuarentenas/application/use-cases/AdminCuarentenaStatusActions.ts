import type { IAdminCuarentenaDetailRepository } from "../../domain/repositories/IAdminCuarentenaDetailRepository";

export class UpdateAdminCuarentenaStatusUseCase {
  constructor(private readonly repo: IAdminCuarentenaDetailRepository) {}

  execute(id: string, status: "active" | "released" | "suspended"): Promise<void> {
    return this.repo.updateStatus(id, status);
  }
}
