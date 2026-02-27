import type { AdminMvz } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";
import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
} from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE_URL = "/api/admin/mvz";
const BATCH_URL = "/api/admin/mvz/batch";

interface FetchAdminMvzParams {
  accessToken: string;
}

interface FetchAdminMvzResult {
  mvzProfiles: AdminMvz[];
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

export async function fetchAdminMvz(params: FetchAdminMvzParams): Promise<FetchAdminMvzResult> {
  const response = await fetch(BASE_URL, {
    headers: authHeaders(params.accessToken),
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar MVZ.");
  }

  return {
    mvzProfiles: (body.data.mvzProfiles ?? []) as AdminMvz[],
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
  async list(): Promise<AdminMvz[]> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesion activa.");
    const result = await fetchAdminMvz({ accessToken });
    return result.mvzProfiles;
  }

  async createBatch(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesion activa.");
    return createAdminMvzBatch({ accessToken, ...input });
  }
}
