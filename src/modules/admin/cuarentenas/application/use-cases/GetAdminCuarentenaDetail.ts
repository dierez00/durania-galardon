import type { IAdminCuarentenaDetailRepository } from "../../domain/repositories/IAdminCuarentenaDetailRepository";
import type { AdminCuarentenaDetallada } from "../../domain/entities/AdminCuarentenaDetailEntity";

export class GetAdminCuarentenaDetail {
  constructor(private readonly repo: IAdminCuarentenaDetailRepository) {}

  execute(id: string): Promise<AdminCuarentenaDetallada | null> {
    return this.repo.getById(id);
  }
}
