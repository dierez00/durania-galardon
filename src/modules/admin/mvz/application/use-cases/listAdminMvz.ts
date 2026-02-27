import type { AdminMvz } from "../../domain/entities/AdminMvzEntity";
import type { AdminMvzRepository } from "../../domain/repositories/adminMvzRepository";

export function listAdminMvz(repository: AdminMvzRepository): AdminMvz[] {
  return repository.list();
}
