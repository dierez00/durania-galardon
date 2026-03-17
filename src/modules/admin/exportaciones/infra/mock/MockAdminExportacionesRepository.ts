import type {
  AdminExportacionesRepository,
  ListAdminExportacionesParams,
  ListAdminExportacionesResult,
} from "../../domain/repositories/adminExportacionesRepository";
import type { AdminExportacion } from "../../domain/entities/AdminExportacionEntity";
import { adminExportacionesMock } from "./adminExportaciones.mock";

export class MockAdminExportacionesRepository implements AdminExportacionesRepository {
  async list(params: ListAdminExportacionesParams): Promise<ListAdminExportacionesResult> {
    let data: AdminExportacion[] = [...adminExportacionesMock];

    if (params.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (e) =>
          e.upp_name?.toLowerCase().includes(q) ||
          e.producer_name?.toLowerCase().includes(q) ||
          e.upp_id?.toLowerCase().includes(q)
      );
    }
    if (params.status) {
      data = data.filter((e) => e.status === params.status);
    }

    const total = data.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const start = (page - 1) * limit;
    data = data.slice(start, start + limit);

    return { exportaciones: data, total, page, limit };
  }
}
