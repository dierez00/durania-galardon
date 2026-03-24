import type {
  AdminProductorBatchCreateInput,
  AdminProductorBatchCreateResult,
  AdminProductorCreateResult,
  AdminProductoresRepository,
  AdminProductorCreateInput,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "../../domain/repositories/adminProductoresRepository";
import { adminProductoresMock } from "./adminProductores.mock";

export class MockAdminProductoresRepository implements AdminProductoresRepository {
  async list(_params: ListAdminProductoresParams): Promise<ListAdminProductoresResult> {
    return {
      producers: adminProductoresMock,
      total: adminProductoresMock.length,
      page: 1,
      limit: 20,
    };
  }

  async create(_input: AdminProductorCreateInput): Promise<AdminProductorCreateResult> {
    throw new Error("Not implemented in mock.");
  }

  async createBatch(_input: AdminProductorBatchCreateInput): Promise<AdminProductorBatchCreateResult> {
    return {
      created: [],
      count: 0,
    };
  }
}
