import type {
  AdminCuarentenasRepository,
  AdminCuarentenaCreateInput,
  ListAdminCuarentenasParams,
  ListAdminCuarentenasResult,
} from "../../domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentena } from "../../domain/entities/AdminCuarentenaEntity";
import type {
  AdminCuarentenaMapPoint,
  AdminCuarentenaActivationContextItem,
} from "../../domain/entities/AdminCuarentenaDetailEntity";
import { adminCuarentenasMock } from "./adminCuarentenas.mock";

export class MockAdminCuarentenasRepository implements AdminCuarentenasRepository {
  private readonly data: AdminCuarentena[] = [...adminCuarentenasMock];

  async list(params: ListAdminCuarentenasParams): Promise<ListAdminCuarentenasResult> {
    let filtered = this.data;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (q2) =>
          q2.title.toLowerCase().includes(q) ||
          (q2.uppName?.toLowerCase().includes(q) ?? false) ||
          (q2.producerName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (params.status) filtered = filtered.filter((c) => c.status === params.status);
    if (params.quarantineType) filtered = filtered.filter((c) => c.quarantineType === params.quarantineType);
    const page  = params.page  ?? 1;
    const limit = params.limit ?? 20;
    const start = (page - 1) * limit;
    return {
      quarantines: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  async create(input: AdminCuarentenaCreateInput): Promise<AdminCuarentena> {
    const newItem: AdminCuarentena = {
      id: `mock-${Date.now()}`,
      title: input.title,
      uppId: input.uppId ?? null,
      uppName: null,
      producerName: null,
      status: "active",
      quarantineType: input.quarantineType,
      startedAt: new Date().toISOString(),
      releasedAt: null,
    };
    this.data.unshift(newItem);
    return newItem;
  }

  async getMapPoints(): Promise<AdminCuarentenaMapPoint[]> {
    return [];
  }

  async getActivationContext(): Promise<AdminCuarentenaActivationContextItem[]> {
    return [];
  }
}
