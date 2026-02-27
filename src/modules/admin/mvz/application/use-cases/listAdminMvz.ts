import type { AdminMvz } from "../../domain/entities/AdminMvzEntity";
import type { AdminMvzRepository } from "../../domain/repositories/adminMvzRepository";

export class ListAdminMvz {
  constructor(private readonly repository: AdminMvzRepository) {}

  async execute(): Promise<AdminMvz[]> {
    return this.repository.list();
  }
}
