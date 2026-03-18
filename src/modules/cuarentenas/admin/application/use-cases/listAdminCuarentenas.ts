import type {
  AdminCuarentenasRepository,
  ListAdminCuarentenasParams,
  ListAdminCuarentenasResult,
} from "../../domain/repositories/adminCuarentenasRepository";

export class ListAdminCuarentenas {
  constructor(private readonly repository: AdminCuarentenasRepository) {}

  execute(params: ListAdminCuarentenasParams): Promise<ListAdminCuarentenasResult> {
    return this.repository.list(params);
  }
}

