import type {
  AdminProductor,
  AdminProductoresSortDir,
  AdminProductoresSortField,
} from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import type { CreateAdminProductorDTO } from "@/modules/admin/productores/application/dto/CreateAdminProductorDTO";
import type { UpdateAdminProductorDTO } from "@/modules/admin/productores/application/dto/UpdateAdminProductorDTO";
import type {
  AdminProductorBatchCreateInput,
  AdminProductorBatchCreateResult,
  AdminProductorCreateResult,
  AdminProductorCreateInput,
  AdminProductoresRepository,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "@/modules/admin/productores/domain/repositories/adminProductoresRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE_URL = "/api/admin/producers";
const BATCH_URL = "/api/admin/producers/batch";

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

export interface AdminProducerOption {
  id: string;
  full_name: string;
  curp?: string;
}

export interface CreateAdminProductorParams extends CreateAdminProductorDTO {
  accessToken: string;
}

export interface UpdateAdminProductorParams extends UpdateAdminProductorDTO {
  accessToken: string;
}

export interface CreateAdminProductoresBatchParams extends AdminProductorBatchCreateInput {
  accessToken: string;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function requireSessionAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No existe sesion activa.");
  return accessToken;
}

async function fetchAdminProductoresFromSession(
  params: Omit<FetchAdminProductoresParams, "accessToken">
): Promise<FetchAdminProductoresResult> {
  const accessToken = await requireSessionAccessToken();
  return fetchAdminProductores({ accessToken, ...params });
}

function toAdminProducerOption(producer: AdminProductor): AdminProducerOption {
  return {
    id: producer.id,
    full_name: producer.full_name,
    curp: producer.curp ?? undefined,
  };
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== ""
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&")
  );
}

export async function fetchAdminProductores(
  params: FetchAdminProductoresParams
): Promise<FetchAdminProductoresResult> {
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
    throw new Error(body.error?.message ?? "No fue posible cargar productores.");
  }

  return {
    producers: (body.data.producers ?? []) as AdminProductor[],
    total: body.data.total ?? body.data.producers?.length ?? 0,
    page: body.data.page ?? page,
    limit: body.data.limit ?? limit,
  };
}

export async function createAdminProductor(
  params: CreateAdminProductorParams
): Promise<AdminProductorCreateResult> {
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

  return {
    producer: body.data.producer as AdminProductor,
    invitationSent: body.data.invitationSent === true,
  };
}

export async function createAdminProductoresBatch(
  params: CreateAdminProductoresBatchParams
): Promise<AdminProductorBatchCreateResult> {
  const { accessToken, ...payload } = params;
  const response = await fetch(BATCH_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    const message = body.error?.message ?? "No fue posible crear productores en lote.";
    throw new Error(message);
  }

  return {
    created: body.data.created ?? [],
    count: body.data.count ?? 0,
  };
}

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

export class AdminProductoresApiRepository implements AdminProductoresRepository {
  async list(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult> {
    return fetchAdminProductoresFromSession(params);
  }

  async create(input: AdminProductorCreateInput): Promise<AdminProductorCreateResult> {
    const accessToken = await requireSessionAccessToken();
    return createAdminProductor({ accessToken, ...input });
  }

  async createBatch(input: AdminProductorBatchCreateInput): Promise<AdminProductorBatchCreateResult> {
    const accessToken = await requireSessionAccessToken();
    return createAdminProductoresBatch({ accessToken, ...input });
  }
}

export async function apiFetchAdminProducerOptions(limit = 1000): Promise<AdminProducerOption[]> {
  const result = await fetchAdminProductoresFromSession({
    page: 1,
    limit,
  });

  return result.producers.map(toAdminProducerOption);
}
