import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
  ListAdminMvzParams,
  ListAdminMvzResult,
} from "../../domain/repositories/adminMvzRepository";
import { adminMvzMock } from "./adminMvz.mock";

export class MockAdminMvzRepository implements AdminMvzRepository {
  async list(_params: ListAdminMvzParams): Promise<ListAdminMvzResult> {
    return {
      mvzProfiles: adminMvzMock,
      total: adminMvzMock.length,
      page: 1,
      limit: 20,
    };
  }

  async createBatch(_input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    return {
      created: [],
      count: 0,
    };
  }
}
