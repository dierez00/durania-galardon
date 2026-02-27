import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
} from "../../domain/repositories/adminMvzRepository";
import type { AdminMvz } from "../../domain/entities/AdminMvzEntity";
import { adminMvzMock } from "./adminMvz.mock";

export class MockAdminMvzRepository implements AdminMvzRepository {
  async list(): Promise<AdminMvz[]> {
    return adminMvzMock;
  }

  async createBatch(_input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    return {
      created: [],
      count: 0,
    };
  }
}
