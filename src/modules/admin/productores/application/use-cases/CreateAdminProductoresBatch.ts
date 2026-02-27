import type {
  AdminProductorBatchCreateInput,
  AdminProductorBatchCreateResult,
  AdminProductoresRepository,
} from "../../domain/repositories/adminProductoresRepository";

export class CreateAdminProductoresBatch {
  constructor(private readonly repository: AdminProductoresRepository) {}

  async execute(input: AdminProductorBatchCreateInput): Promise<AdminProductorBatchCreateResult> {
    return this.repository.createBatch(input);
  }
}
