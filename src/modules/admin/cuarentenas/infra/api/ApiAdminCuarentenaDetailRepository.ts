import type { IAdminCuarentenaDetailRepository } from "@/modules/admin/cuarentenas/domain/repositories/IAdminCuarentenaDetailRepository";
import type { AdminCuarentenaDetallada } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaDetailEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/quarantines";

function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export class ApiAdminCuarentenaDetailRepository
  implements IAdminCuarentenaDetailRepository
{
  async getById(id: string): Promise<AdminCuarentenaDetallada | null> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { quarantine: AdminCuarentenaDetallada };
    };
    return json.data?.quarantine ?? null;
  }

  async updateStatus(
    id: string,
    status: "active" | "released" | "suspended"
  ): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al actualizar estado.");
    }
  }

  async updateInfo(
    id: string,
    payload: { epidemiologicalNote?: string; geojson?: Record<string, unknown> | null }
  ): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al guardar información.");
    }
  }
}
