import { getServerEnv } from "@/shared/config";

type QueryValue = string | number | undefined;

export interface IotUppHistoryQuery {
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

export interface IotCollarHistoryQuery extends IotUppHistoryQuery {}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new Error("IOT_BACKEND_URL no esta configurada.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol;
}

function buildUrl(pathname: string, query?: Record<string, QueryValue>): string {
  const baseUrl = normalizeBaseUrl(getServerEnv().iotBackendUrl);
  const url = new URL(pathname, `${baseUrl}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchJson<T>(
  pathname: string,
  query?: Record<string, QueryValue>,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(buildUrl(pathname, query), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const body = await parseJsonSafely<{ error?: { message?: string }; message?: string }>(response);
    throw new Error(
      body?.error?.message ??
        body?.message ??
        `IoT backend respondio con estado ${response.status}.`
    );
  }

  const data = await parseJsonSafely<T>(response);
  if (!data) {
    throw new Error("IoT backend devolvio una respuesta invalida.");
  }

  return data;
}

async function fetchSse(pathname: string, query?: Record<string, QueryValue>, signal?: AbortSignal) {
  const response = await fetch(buildUrl(pathname, query), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await parseJsonSafely<{ error?: { message?: string }; message?: string }>(response);
    throw new Error(
      body?.error?.message ??
        body?.message ??
        `No fue posible abrir stream SSE (status ${response.status}).`
    );
  }

  return response;
}

export async function getUppCollarsRealtimeSnapshot(
  uppId: string,
  tenantId: string,
  signal?: AbortSignal
) {
  return fetchJson<unknown>(`/api/upps/${encodeURIComponent(uppId)}/collars/redis/realtime`, {
    tenantId,
  }, signal);
}

export async function getUppCollarsHistory(
  uppId: string,
  tenantId: string,
  query?: IotUppHistoryQuery,
  signal?: AbortSignal
) {
  return fetchJson<unknown>(`/api/upps/${encodeURIComponent(uppId)}/collars/history`, {
    tenantId,
    from: query?.from,
    to: query?.to,
    limit: query?.limit,
    page: query?.page,
  }, signal);
}

export async function streamUppCollarsRealtime(
  uppId: string,
  tenantId: string,
  signal?: AbortSignal
) {
  return fetchSse(`/api/upps/${encodeURIComponent(uppId)}/collars/realtime/stream`, {
    tenantId,
  }, signal);
}

export async function streamCollarRealtime(collarId: string, signal?: AbortSignal) {
  return fetchSse(`/api/collars/${encodeURIComponent(collarId)}/realtime/stream`, undefined, signal);
}

export async function getCollarHistory(
  collarUuid: string,
  tenantId: string,
  query?: IotCollarHistoryQuery,
  signal?: AbortSignal
) {
  return fetchJson<unknown>(`/api/collars/${encodeURIComponent(collarUuid)}/history`, {
    tenantId,
    from: query?.from,
    to: query?.to,
    limit: query?.limit,
    page: query?.page,
  }, signal);
}
