import type {
  AdminCuarentenasRepository,
  AdminCuarentenaCreateInput,
  ListAdminCuarentenasParams,
  ListAdminCuarentenasResult,
} from "@/modules/cuarentenas/admin/domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentena } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaEntity";
import type {
  AdminCuarentenaMapPoint,
  AdminCuarentenaActivationContextItem,
} from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaDetailEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/quarantines";

function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export class AdminCuarentenasApiRepository implements AdminCuarentenasRepository {
  async list(params: ListAdminCuarentenasParams): Promise<ListAdminCuarentenasResult> {
    const token = await getAccessToken();
    const qs = new URLSearchParams();
    if (params.search)         qs.set("search", params.search);
    if (params.status)         qs.set("status", params.status);
    if (params.quarantineType) qs.set("quarantineType", params.quarantineType);
    if (params.dateFrom)       qs.set("dateFrom", params.dateFrom);
    if (params.dateTo)         qs.set("dateTo", params.dateTo);
    if (params.page)           qs.set("page", String(params.page));
    if (params.limit)          qs.set("limit", String(params.limit));
    if (params.sortBy)         qs.set("sortBy", params.sortBy);
    if (params.sortDir)        qs.set("sortDir", params.sortDir);

    const resp = await fetch(`${BASE}?${qs.toString()}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return { quarantines: [], total: 0, page: 1, limit: 20 };
    const json = (await resp.json()) as {
      ok: boolean;
      data?: ListAdminCuarentenasResult;
    };
    return (
      json.data ?? { quarantines: [], total: 0, page: 1, limit: 20 }
    );
  }

  async create(input: AdminCuarentenaCreateInput): Promise<AdminCuarentena> {
    const token = await getAccessToken();
    const resp = await fetch(BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        title: input.title,
        uppId: input.uppId,
        quarantineType: input.quarantineType,
        reason: input.reason,
        epidemiologicalNote: input.epidemiologicalNote,
        geojson: input.geojson,
      }),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al crear cuarentena.");
    }
    const json = (await resp.json()) as { ok: boolean; data?: { quarantine: AdminCuarentena } };
    if (!json.data?.quarantine) throw new Error("Respuesta inesperada del servidor.");
    return json.data.quarantine;
  }

  async getMapPoints(): Promise<AdminCuarentenaMapPoint[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/map`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { points: AdminCuarentenaMapPoint[] };
    };
    return json.data?.points ?? [];
  }

  async getActivationContext(): Promise<AdminCuarentenaActivationContextItem[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/activation-context`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { upps: AdminCuarentenaActivationContextItem[] };
    };
    return json.data?.upps ?? [];
  }
}

