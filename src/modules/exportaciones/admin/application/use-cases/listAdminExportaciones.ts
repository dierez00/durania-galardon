import type {
  AdminExportacionesRepository,
  ListAdminExportacionesParams,
  ListAdminExportacionesResult,
} from "../../domain/repositories/adminExportacionesRepository";

export class ListAdminExportaciones {
  constructor(private readonly repository: AdminExportacionesRepository) {}

  async execute(params: ListAdminExportacionesParams): Promise<ListAdminExportacionesResult> {
    return this.repository.list(params);
  }
}
