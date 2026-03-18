import type {
  AdminExportacionesRepository,
  ListAdminExportacionesParams,
  ListAdminExportacionesResult,
} from "../../domain/repositories/adminExportacionesRepository";
import type { AdminExportacion } from "../../domain/entities/AdminExportacionEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE_URL = "/api/admin/exports";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export class AdminExportacionesApiRepository implements AdminExportacionesRepository {
  async list(params: ListAdminExportacionesParams): Promise<ListAdminExportacionesResult> {
    const token = await getAccessToken();
    if (!token) throw new Error("No hay sesión activa.");

    const qs = buildQuery({
      search: params.search,
      status: params.status,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    });

    const resp = await fetch(`${BASE_URL}${qs}`, { headers: authHeaders(token) });
    const body = (await resp.json()) as {
      ok: boolean;
      data?: { exports: AdminExportacion[]; total?: number; page?: number; limit?: number };
      error?: { message: string };
    };

    if (!resp.ok || !body.ok) {
      throw new Error(body.error?.message ?? "No fue posible cargar exportaciones.");
    }

    const data = body.data;
    return {
      exportaciones: data?.exports ?? [],
      total: data?.total ?? data?.exports?.length ?? 0,
      page: data?.page ?? params.page ?? 1,
      limit: data?.limit ?? params.limit ?? 20,
    };
  }
}
