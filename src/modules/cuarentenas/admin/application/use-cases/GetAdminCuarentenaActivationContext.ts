import type { AdminCuarentenasRepository } from "../../domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentenaActivationContextItem } from "../../domain/entities/AdminCuarentenaDetailEntity";

export class GetAdminCuarentenaActivationContext {
  constructor(private readonly repository: AdminCuarentenasRepository) {}

  execute(): Promise<AdminCuarentenaActivationContextItem[]> {
    return this.repository.getActivationContext();
  }
}
