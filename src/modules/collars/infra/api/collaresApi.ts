import { getAccessToken } from "@/shared/lib/auth-session";

const ADMIN_BASE = "/api/admin/collars";
const PRODUCER_BASE = "/api/producer/collars";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function getToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("No existe sesión activa.");
  return token;
}

// ============================================================================
// SHARED: Collar Listing with Filters and Pagination
// ============================================================================

export interface FetchCollarFilters {
  status?: string; // Filter by status (inactive, active, linked, unlinked, suspended, retired)
  search?: string; // Search by collar_id or other fields
  firmware?: string; // Filter by firmware version
  dateFrom?: string; // Filter by date range (from)
  dateTo?: string; // Filter by date range (to)
  producerId?: string; // Filter by producer id (admin scope)
}

export interface FetchCollarResponse {
  collars: unknown[];
  total: number;
  limit: number;
  offset: number;
}

export interface IotHistoryQuery {
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

function appendHistoryQuery(params: URLSearchParams, query?: IotHistoryQuery) {
  if (!query) return;
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.page) params.set("page", String(query.page));
}

/**
 * Listar TODOS los collares con filtros y paginación
 * Uso: admin/collars list, collars table con filtros
 * Query params: limit, skip, status, search, firmware, dateFrom, dateTo
 */
export async function apiFetchAllCollars(
  filters?: FetchCollarFilters,
  limit: number = 50,
  offset: number = 0,
  sort?: { field: string; dir: "asc" | "desc" }
): Promise<FetchCollarResponse> {
  const token = await getToken();
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(offset),
  });

  // Add optional filters
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.firmware) params.append("firmware", filters.firmware);
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.producerId) params.append("producerId", filters.producerId);

  if (sort?.field) params.append("sortBy", sort.field);
  if (sort?.dir) params.append("sortDir", sort.dir);

  const url = `${ADMIN_BASE}?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();

  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar collares.");
  }

  return {
    collars: body.data.collars ?? [],
    total: body.data.total ?? 0,
    limit: body.data.limit ?? limit,
    offset: body.data.skip ?? offset,
  };
}

// ============================================================================
// PRODUCER: Collar Management
// ============================================================================

/**
 * Obtener lista de collares sin asignar (disponibles para el productor)
 */
export async function apiFetchProducerCollars(uppId?: string | null): Promise<unknown[]> {
  const token = await getToken();
  const url = uppId
    ? `${PRODUCER_BASE}?uppId=${encodeURIComponent(uppId)}`
    : PRODUCER_BASE;
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar collares.");
  }
  return body.data.collars ?? [];
}

/**
 * Obtener detalle de un collar específico
 */
export async function apiFetchCollarDetail(collarId: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${PRODUCER_BASE}/${collarId}`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar collar.");
  }
  return body.data.collar ?? null;
}

/**
 * Asignar un collar a un animal específico
 */
export async function apiAssignCollar(
  collarId: string,
  animalId: string,
  linkedBy?: string,
  notes?: string
): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${PRODUCER_BASE}/${collarId}/assign`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ animal_id: animalId, linked_by: linkedBy, notes }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible asignar collar.");
  }
  return body.data;
}

/**
 * Desasignar un collar de un animal
 */
export async function apiUnassignCollar(
  collarId: string,
  unlinkedBy: string,
  reason?: string
): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${PRODUCER_BASE}/${collarId}/unassign`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ unlinked_by: unlinkedBy, reason }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible desasignar collar.");
  }
  return body.data;
}

/**
 * Obtener historial de asignaciones (audit trail)
 */
export async function apiFetchCollarHistory(collarId: string): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${PRODUCER_BASE}/${collarId}/history`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar historial.");
  }
  return body.data.history ?? [];
}

// ============================================================================
// PRODUCER: IoT App Web Internal Proxy
// ============================================================================

export async function apiFetchProducerUppRealtimeSnapshot(uppId: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`/api/producer/upp/${encodeURIComponent(uppId)}/collars/realtime`, {
    headers: authHeaders(token),
  });

  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar ubicaciones en tiempo real.");
  }

  return body.data;
}

export async function apiFetchProducerUppHistory(
  uppId: string,
  query?: IotHistoryQuery
): Promise<unknown> {
  const token = await getToken();
  const params = new URLSearchParams();
  appendHistoryQuery(params, query);

  const qs = params.toString();
  const url = `/api/producer/upp/${encodeURIComponent(uppId)}/collars/history${
    qs ? `?${qs}` : ""
  }`;

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar historial IoT por UPP.");
  }

  return body.data;
}

export async function apiFetchProducerCollarIotHistory(
  collarId: string,
  query?: IotHistoryQuery
): Promise<unknown> {
  const token = await getToken();
  const params = new URLSearchParams();
  appendHistoryQuery(params, query);

  const qs = params.toString();
  const url = `/api/producer/collars/${encodeURIComponent(collarId)}/iot/history${
    qs ? `?${qs}` : ""
  }`;

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar historial IoT por collar.");
  }

  return body.data;
}

export async function apiOpenProducerUppRealtimeStream(uppId: string): Promise<Response> {
  const token = await getToken();
  const headers = {
    ...authHeaders(token),
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
  };

  const primaryUrl = `/api/producer/upp/${encodeURIComponent(uppId)}/collars/realtime/stream`;
  const fallbackUrl = `/api/producer/upp/${encodeURIComponent(uppId)}/collars/realtime-stream`;

  let response = await fetch(primaryUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (response.status === 404) {
    response = await fetch(fallbackUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  }

  if (!response.ok || !response.body) {
    let message = "No fue posible abrir stream IoT por UPP.";
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // noop: mantiene mensaje por defecto
    }
    throw new Error(message);
  }

  return response;
}

export async function apiOpenProducerCollarRealtimeStream(collarId: string): Promise<Response> {
  const token = await getToken();
  const response = await fetch(
    `/api/producer/collars/${encodeURIComponent(collarId)}/iot/realtime/stream`,
    {
      method: "GET",
      headers: {
        ...authHeaders(token),
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    }
  );

  if (!response.ok || !response.body) {
    let message = "No fue posible abrir stream IoT por collar.";
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // noop: mantiene mensaje por defecto
    }
    throw new Error(message);
  }

  return response;
}

// ============================================================================
// ADMIN: Inventory Management
// ============================================================================

/**
 * Listar collares del inventario (filtrado por estado)
 */
export async function apiFetchAdminCollars(status?: string, limit = 50): Promise<unknown[]> {
  const token = await getToken();
  const url = status
    ? `${ADMIN_BASE}?status=${encodeURIComponent(status)}&limit=${limit}`
    : `${ADMIN_BASE}?limit=${limit}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar inventario.");
  }
  return body.data.collars ?? [];
}

/**
 * Provisionar (registrar) un nuevo collar en el sistema
 */
export async function apiProvisionCollar(
  collar_id: string,
  firmware_version?: string,
  purchased_at?: string,
  producer_id?: string
): Promise<unknown> {
  const token = await getToken();
  const payload: Record<string, unknown> = { collar_id, firmware_version, purchased_at };
  if (producer_id) {
    payload.producer_id = producer_id;
  }

  const res = await fetch(ADMIN_BASE, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible proveer collar.");
  }
  return body.data.collar;
}

/**
 * Cambiar estado de un collar (suspender, retirar, etc)
 */
export async function apiUpdateCollarStatus(
  collarId: string,
  status: "suspended" | "retired",
  reason?: string
): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${ADMIN_BASE}/${collarId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible actualizar estado.");
  }
  return body.data.collar;
}

export async function apiFetchAdminCollarDetail(collarId: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${ADMIN_BASE}/${collarId}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;

  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar collar.");
  }

  return body.data ?? null;
}

export async function apiUpdateAdminCollar(
  collarId: string,
  payload: {
    status?: string;
    notes?: string;
    producer_id?: string | null;
    collar_id?: string;
    purchased_at?: string;
  }
): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${ADMIN_BASE}/${collarId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible actualizar collar.");
  }

  return body.data?.collar;
}
