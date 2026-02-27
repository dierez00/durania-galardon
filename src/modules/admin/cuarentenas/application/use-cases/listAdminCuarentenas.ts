import type { AdminCuarentena } from "../../domain/entities/AdminCuarentenaEntity";
import type { AdminCuarentenasRepository } from "../../domain/repositories/adminCuarentenasRepository";

export function listAdminCuarentenas(repository: AdminCuarentenasRepository): AdminCuarentena[] {
  return repository.list();
}
