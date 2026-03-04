import type { AdminCuarentenaDetallada } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaDetailEntity";

export interface IAdminCuarentenaDetailRepository {
  getById(id: string): Promise<AdminCuarentenaDetallada | null>;
  updateStatus(
    id: string,
    status: "active" | "released" | "suspended"
  ): Promise<void>;
  updateInfo(
    id: string,
    payload: { epidemiologicalNote?: string; geojson?: Record<string, unknown> | null }
  ): Promise<void>;
}
