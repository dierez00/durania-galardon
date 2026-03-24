import type {
  AdminCuarentenasRepository,
  AdminCuarentenaCreateInput,
} from "../../domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentena } from "../../domain/entities/AdminCuarentenaEntity";

export class CreateAdminCuarentena {
  constructor(private readonly repository: AdminCuarentenasRepository) {}

  execute(input: AdminCuarentenaCreateInput): Promise<AdminCuarentena> {
    return this.repository.create(input);
  }
}
