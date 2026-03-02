import type { AdminMvzRepository, ListAdminMvzParams, ListAdminMvzResult } from "../../domain/repositories/adminMvzRepository";

export class ListAdminMvz {
  constructor(private readonly repository: AdminMvzRepository) {}

  async execute(params: ListAdminMvzParams): Promise<ListAdminMvzResult> {
    return this.repository.list(params);
  }
}
