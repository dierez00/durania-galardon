import type {
  AdminProductoresRepository,
  AdminProductorCreateInput,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "../../domain/repositories/adminProductoresRepository";
import type { AdminProductor } from "../../domain/entities/AdminProductorEntity";
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

  async create(_input: AdminProductorCreateInput): Promise<AdminProductor> {
    throw new Error("Not implemented in mock.");
  }
}
