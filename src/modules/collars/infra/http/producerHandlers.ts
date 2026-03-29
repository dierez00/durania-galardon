import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { createCollarUseCases } from "../container";
import { toApiCollar, toApiCollarList, toApiHistoryList } from "./shared";
import type {
  ProducerAssignCollarDTO,
  ProducerUnassignCollarDTO,
} from "../../application/dto/index";

/**
 * GET /api/producer/collars - List collars with optional filters and pagination
 * Query params:
 *   - limit: Max results (default 50, max 500)
 *   - skip: Pagination offset (default 0)
 *   - status: Filter by collar status (inactive, active, linked, unlinked, suspended, retired)
 *   - search: Search by collar_id
 *   - firmware: Filter by firmware version
 *   - dateFrom: Filter by created_at >= this date (ISO8601)
 *   - dateTo: Filter by created_at <= this date (ISO8601)
 */
export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin", "producer", "employee"],
    permissions: ["admin.collars.read", "producer.collars.read"],
    requireAllPermissions: false, // Either permission is fine
    resource: "collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limit = Math.min(Number.parseInt(url.searchParams.get("limit") || "50"), 500);
  const skip = Number.parseInt(url.searchParams.get("skip") || "0");

  // Extract optional filters
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const firmware = url.searchParams.get("firmware");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  try {
    const useCases = createCollarUseCases(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );

    // Get all collars for the tenant with pagination and filters
    const result = await useCases.getAllCollars.execute(limit, skip, {
      status: status || undefined,
      search: search || undefined,
      firmware: firmware || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

    return apiSuccess({
      collars: toApiCollarList(result.collars),
      total: result.total,
      limit: result.limit,
      skip: result.offset,
    });
  } catch (error) {
    return apiError(
      "LIST_COLLARS_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar collares.",
      500
    );
  }
}

/**
 * GET /api/producer/collars/[collarId] - Get collar detail
 */
export async function getDetail(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;

  try {
    const useCases = createCollarUseCases(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );

    const collar = await useCases.getDetail.execute(collarId);
    if (!collar) {
      return apiError("NOT_FOUND", "Collar no encontrado.", 404);
    }

    return apiSuccess({ collar: toApiCollar(collar) });
  } catch (error) {
    return apiError(
      "PRODUCER_GET_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar collar.",
      500
    );
  }
}

/**
 * POST /api/producer/collars/[collarId]/assign - Assign collar to animal
 */
export async function assignCollar(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.write"],
    resource: "producer.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;

  let body: ProducerAssignCollarDTO;
  try {
    body = (await request.json()) as ProducerAssignCollarDTO;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de solicitud no es JSON válido.");
  }

  const { animal_id, linked_by, notes } = body;
  const actorId = linked_by?.trim() || auth.context.user.id;

  if (!animal_id?.trim()) {
    return apiError(
      "INVALID_PAYLOAD",
      "El campo 'animal_id' es requerido."
    );
  }

  try {
    const useCases = createCollarUseCases(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );

    const result = await useCases.assignCollar.execute(collarId, {
      animal_id: animal_id.trim(),
      linked_by: actorId,
      notes: notes?.trim(),
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "update",
      resource: "producer.collars",
      resourceId: collarId,
      payload: { animal_id, linked_by: actorId },
    });

    return apiSuccess({
      success: true,
      collar: toApiCollar(result.collar),
      history_entry: result.history_entry,
    });
  } catch (error) {
    return apiError(
      "PRODUCER_ASSIGN_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible asignar collar.",
      400
    );
  }
}

/**
 * POST /api/producer/collars/[collarId]/unassign - Unassign collar from animal
 */
export async function unassignCollar(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.write"],
    resource: "producer.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;

  let body: ProducerUnassignCollarDTO;
  try {
    body = (await request.json()) as ProducerUnassignCollarDTO;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de solicitud no es JSON válido.");
  }

  const { unlinked_by, notes } = body;
  const actorId = unlinked_by?.trim() || auth.context.user.id;

  try {
    const useCases = createCollarUseCases(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );

    const result = await useCases.unassignCollar.execute(collarId, {
      unlinked_by: actorId,
      notes: notes?.trim(),
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "update",
      resource: "producer.collars",
      resourceId: collarId,
      payload: { notes },
    });

    return apiSuccess({
      success: true,
      collar: toApiCollar(result.collar),
      history_entry: result.history_entry,
    });
  } catch (error) {
    return apiError(
      "PRODUCER_UNASSIGN_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible desasignar collar.",
      400
    );
  }
}

/**
 * GET /api/producer/collars/[collarId]/history - Get collar history
 */
export async function getHistory(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.collars.read"],
    resource: "producer.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { collarId } = await params;

  try {
    const useCases = createCollarUseCases(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );

    const history = await useCases.getHistory.execute(collarId);
    return apiSuccess({ history: toApiHistoryList(history) });
  } catch (error) {
    return apiError(
      "PRODUCER_GET_COLLAR_HISTORY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar historial.",
      500
    );
  }
}
