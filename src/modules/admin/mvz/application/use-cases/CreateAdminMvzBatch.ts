import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
} from "../../domain/repositories/adminMvzRepository";

export class CreateAdminMvzBatch {
  constructor(private readonly repository: AdminMvzRepository) {}

  async execute(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    return this.repository.createBatch(input);
  }
}
