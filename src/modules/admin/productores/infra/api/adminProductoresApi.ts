import type {
  AdminProductor,
  AdminProductoresSortField,
  AdminProductoresSortDir,
} from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import type { CreateAdminProductorDTO } from "@/modules/admin/productores/application/dto/CreateAdminProductorDTO";
import type { UpdateAdminProductorDTO } from "@/modules/admin/productores/application/dto/UpdateAdminProductorDTO";
import type {
  AdminProductoresRepository,
  AdminProductorCreateInput,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "@/modules/admin/productores/domain/repositories/adminProductoresRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE_URL = "/api/admin/producers";

// ─── Parámetros ────────────────────────────────────────────────────────────────

export interface FetchAdminProductoresParams {
  accessToken: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminProductoresSortField;
  sortDir?: AdminProductoresSortDir;
  dateFrom?: string;
  dateTo?: string;
}

export interface FetchAdminProductoresResult {
  producers: AdminProductor[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateAdminProductorParams extends CreateAdminProductorDTO {
  accessToken: string;
}

export interface UpdateAdminProductorParams extends UpdateAdminProductorDTO {
  accessToken: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== ""
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

// ─── GET — lista con filtros y paginación ──────────────────────────────────────

export async function fetchAdminProductores(
  params: FetchAdminProductoresParams
): Promise<FetchAdminProductoresResult> {
  const { accessToken, search, status, page = 1, limit = 20, sortBy, sortDir, dateFrom, dateTo } = params;

  const qs = buildQueryString({ search, status, page, limit, sortBy, sortDir, dateFrom, dateTo });
  const response = await fetch(`${BASE_URL}${qs}`, {
    headers: authHeaders(accessToken),
  });

  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar productores.");
  }

  return {
    producers: (body.data.producers ?? []) as AdminProductor[],
    total: body.data.total ?? body.data.producers?.length ?? 0,
    page: body.data.page ?? page,
    limit: body.data.limit ?? limit,
  };
}

// ─── POST — crear productor ─────────────────────────────────────────────────────

export async function createAdminProductor(
  params: CreateAdminProductorParams
): Promise<AdminProductor> {
  const { accessToken, ...dto } = params;

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(dto),
  });

  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible crear productor.");
  }

  return body.data.producer as AdminProductor;
}

// ─── PATCH — actualizar productor ─────────────────────────────────────────────

export async function updateAdminProductor(
  params: UpdateAdminProductorParams
): Promise<AdminProductor> {
  const { accessToken, ...dto } = params;

  const response = await fetch(BASE_URL, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(dto),
  });

  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible actualizar productor.");
  }

  return body.data.producer as AdminProductor;
}

// ─── Adaptador hexagonal ────────────────────────────────────────────────────────

/**
 * AdminProductoresApiRepository implementa el puerto AdminProductoresRepository
 * usando fetch hacia /api/admin/producers.
 * Es la única clase del proyecto que conoce este endpoint.
 * La presentation NUNCA debe importar este archivo directamente.
 */
export class AdminProductoresApiRepository implements AdminProductoresRepository {
  async list(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesión activa.");
    return fetchAdminProductores({ accessToken, ...params });
  }

  async create(input: AdminProductorCreateInput): Promise<AdminProductor> {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("No existe sesión activa.");
    return createAdminProductor({ accessToken, ...input });
  }
}
