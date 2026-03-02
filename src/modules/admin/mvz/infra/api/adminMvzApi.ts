import type {
  AdminMvz,
  AdminMvzSortDir,
  AdminMvzSortField,
} from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";
import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
  ListAdminMvzParams,
  ListAdminMvzResult,
} from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE_URL = "/api/admin/mvz";
const BATCH_URL = "/api/admin/mvz/batch";

interface FetchAdminMvzParams {
  accessToken: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminMvzSortField;
  sortDir?: AdminMvzSortDir;
  dateFrom?: string;
  dateTo?: string;
}

interface FetchAdminMvzResult {
  mvzProfiles: AdminMvz[];
  total: number;
  page: number;
  limit: number;
}

interface CreateAdminMvzBatchParams extends AdminMvzBatchCreateInput {
  accessToken: string;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  ) as [string, string | number][];
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

export async function fetchAdminMvz(params: FetchAdminMvzParams): Promise<FetchAdminMvzResult> {
  const {
    accessToken,
    search,
    status,
    page = 1,
    limit = 20,
    sortBy,
    sortDir,
    dateFrom,
    dateTo,
  } = params;

  const queryString = buildQueryString({
    search,
    status,
    page,
    limit,
    sortBy,
    sortDir,
    dateFrom,
    dateTo,
  });

  const response = await fetch(`${BASE_URL}${queryString}`, {
    headers: authHeaders(accessToken),
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar MVZ.");
  }

  return {
    mvzProfiles: (body.data.mvzProfiles ?? []) as AdminMvz[],
    total: body.data.total ?? body.data.mvzProfiles?.length ?? 0,
    page: body.data.page ?? page,
    limit: body.data.limit ?? limit,
  };
}

export async function createAdminMvzBatch(
  params: CreateAdminMvzBatchParams
): Promise<AdminMvzBatchCreateResult> {
  const { accessToken, ...payload } = params;
  const response = await fetch(BATCH_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible crear MVZ en lote.");
  }

  return {
    created: body.data.created ?? [],
    count: body.data.count ?? 0,
  };
}

export class AdminMvzApiRepository implements AdminMvzRepository {
  async list(params: ListAdminMvzParams): Promise<ListAdminMvzResult> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesion activa.");
    return fetchAdminMvz({ accessToken, ...params });
  }

  async createBatch(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesion activa.");
    return createAdminMvzBatch({ accessToken, ...input });
  }
}
