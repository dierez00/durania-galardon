import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  getCollarHistory,
  getUppCollarsHistory,
  getUppCollarsRealtimeSnapshot,
  streamCollarRealtime,
  streamUppCollarsRealtime,
} from "@/modules/collars/infra/api/external/iotAppWebClient";

function streamHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

function parseNumericQuery(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getProducerUppRealtimeSnapshot(
  request: Request,
  { params }: { params: Promise<{ uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars.iot",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { uppId } = await params;
  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  try {
    const data = await getUppCollarsRealtimeSnapshot(uppId, auth.context.user.tenantId, request.signal);
    return apiSuccess(data);
  } catch (error) {
    return apiError(
      "IOT_UPP_REALTIME_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar tiempo real por UPP.",
      502
    );
  }
}

export async function getProducerUppHistory(
  request: Request,
  { params }: { params: Promise<{ uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars.iot",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { uppId } = await params;
  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const url = new URL(request.url);

  try {
    const data = await getUppCollarsHistory(
      uppId,
      auth.context.user.tenantId,
      {
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        limit: parseNumericQuery(url.searchParams.get("limit"), 100),
        page: parseNumericQuery(url.searchParams.get("page"), 1),
      },
      request.signal
    );

    return apiSuccess(data);
  } catch (error) {
    return apiError(
      "IOT_UPP_HISTORY_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar historico por UPP.",
      502
    );
  }
}

export async function streamProducerUppRealtime(
  request: Request,
  { params }: { params: Promise<{ uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars.iot",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { uppId } = await params;
  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  try {
    const upstream = await streamUppCollarsRealtime(uppId, auth.context.user.tenantId, request.signal);
    return new Response(upstream.body, {
      status: 200,
      headers: streamHeaders(),
    });
  } catch (error) {
    return apiError(
      "IOT_UPP_STREAM_FAILED",
      error instanceof Error ? error.message : "No fue posible abrir stream en tiempo real por UPP.",
      502
    );
  }
}

export async function streamProducerCollarRealtime(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars.iot",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;

  try {
    const upstream = await streamCollarRealtime(collarId, request.signal);
    return new Response(upstream.body, {
      status: 200,
      headers: streamHeaders(),
    });
  } catch (error) {
    return apiError(
      "IOT_COLLAR_STREAM_FAILED",
      error instanceof Error ? error.message : "No fue posible abrir stream en tiempo real por collar.",
      502
    );
  }
}

export async function getProducerCollarHistory(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars.iot",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;
  const url = new URL(request.url);

  try {
    const data = await getCollarHistory(
      collarId,
      auth.context.user.tenantId,
      {
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        limit: parseNumericQuery(url.searchParams.get("limit"), 100),
        page: parseNumericQuery(url.searchParams.get("page"), 1),
      },
      request.signal
    );

    return apiSuccess(data);
  } catch (error) {
    return apiError(
      "IOT_COLLAR_HISTORY_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar historico por collar.",
      502
    );
  }
}
