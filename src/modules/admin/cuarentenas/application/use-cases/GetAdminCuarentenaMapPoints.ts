import type { AdminCuarentenasRepository } from "../../domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentenaMapPoint } from "../../domain/entities/AdminCuarentenaDetailEntity";

export class GetAdminCuarentenaMapPoints {
  constructor(private readonly repository: AdminCuarentenasRepository) {}

  execute(): Promise<AdminCuarentenaMapPoint[]> {
    return this.repository.getMapPoints();
  }
}
