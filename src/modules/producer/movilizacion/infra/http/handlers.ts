import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";
import { createMovementContainer } from "../container";
import {
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

interface MovementBody {
  uppId?: string;
  movementDate?: string;
  routeNote?: string;
  destinationText?: string;
  validUntil?: string;
  authorizedTags?: string[];
}

interface ConfirmArrivalBody {
  movementId?: string;
  destinationType?: "internal" | "external";
  destinationUppId?: string;
  receivedTags?: string[];
  incidenceNote?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.movements.read"],
    resource: "producer.movements",
  });
  if (!auth.ok) {
    return auth.response;
  }

  logProducerAccessServer("producer/movements:get:start", {
    userId: auth.context.user.id,
    role: auth.context.user.role,
    tenantId: auth.context.user.tenantId,
    tenantSlug: auth.context.user.tenantSlug,
    panelType: auth.context.user.panelType,
  });

  const uppId = new URL(request.url).searchParams.get("uppId")?.trim() ?? null;
  if (uppId) {
    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
    }
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const scopedUppIds = uppId ? accessibleUppIds.filter((accessibleUppId) => accessibleUppId === uppId) : accessibleUppIds;
  logProducerAccessServer("producer/movements:get:accessible-ids", {
    userId: auth.context.user.id,
    tenantId: auth.context.user.tenantId,
    accessibleUpps: sampleProducerAccessIds(scopedUppIds),
  });
  if (scopedUppIds.length === 0) {
    logProducerAccessServer("producer/movements:get:empty-access", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
    });
    return apiSuccess({ movements: [] });
  }

  try {
    const container = createMovementContainer({
      tenantId: auth.context.user.tenantId,
      accessToken: auth.context.user.accessToken,
    });
    const rows = await container.listMovementsUseCase.execute(scopedUppIds);

    logProducerAccessServer("producer/movements:get:end", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      movementsCount: rows.length,
    });

    return apiSuccess({
      movements: rows.map((row) => ({
        id: row.id,
        upp_id: row.uppId,
        status: row.status,
        qr_code: row.qrCode,
        route_note: row.routeNote,
        incidence_note: row.incidenceNote,
        movement_date: row.movementDate,
        created_at: row.createdAt,
      })),
    });
  } catch (error) {
    logProducerAccessServer("producer/movements:get:error", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      error: summarizeProducerAccessError(error),
    });
    return apiError("PRODUCER_MOVEMENTS_QUERY_FAILED", error instanceof Error ? error.message : "Error consultando movilizaciones.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.movements.write"],
    resource: "producer.movements",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MovementBody;
  try {
    body = (await request.json()) as MovementBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  if (!uppId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const producerId = await resolveProducerId(auth.context.user);
  if (!producerId) {
    return apiError("PRODUCER_NOT_FOUND", "No fue posible resolver el perfil del productor.", 400);
  }

  const authorizedTags = (body.authorizedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (authorizedTags.length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar authorizedTags con al menos un arete.", 400);
  }

  try {
    const container = createMovementContainer({
      tenantId: auth.context.user.tenantId,
      accessToken: auth.context.user.accessToken,
    });

    const result = await container.createReemoMovementUseCase.execute({
      tenantId: auth.context.user.tenantId,
      producerId,
      requestedByUserId: auth.context.user.id,
      request: {
        uppId,
        movementDate: body.movementDate,
        routeNote: body.routeNote,
        destinationText: body.destinationText,
        validUntil: body.validUntil,
        authorizedTags,
      },
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.movements",
      resourceId: result.movement.id,
      payload: {
        uppId,
        movementDate: body.movementDate ?? null,
        destinationText: body.destinationText ?? null,
        validUntil: body.validUntil ?? null,
        authorizedTags,
      },
    });

    return apiSuccess(
      {
        movement: {
          id: result.movement.id,
          upp_id: result.movement.uppId,
          status: result.movement.status,
          qr_code: result.movement.qrCode,
          route_note: result.movement.routeNote,
          incidence_note: result.movement.incidenceNote,
          movement_date: result.movement.movementDate,
          created_at: result.movement.createdAt,
        },
        sanitaryValidation: result.sanitaryValidation,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(
      "PRODUCER_MOVEMENT_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear solicitud de movilización.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.movements.write"],
    resource: "producer.movements",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ConfirmArrivalBody;
  try {
    body = (await request.json()) as ConfirmArrivalBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  if (!body.movementId?.trim()) {
    return apiError("INVALID_PAYLOAD", "Debe enviar movementId.", 400);
  }
  if (!body.destinationType || !["internal", "external"].includes(body.destinationType)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar destinationType interno o externo.", 400);
  }

  const normalizedReceivedTags = (body.receivedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (normalizedReceivedTags.length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar receivedTags con al menos un arete.", 400);
  }

  if (body.destinationType === "internal") {
    if (!body.destinationUppId?.trim()) {
      return apiError("INVALID_PAYLOAD", "Debe enviar destinationUppId para destino interno.", 400);
    }

    const canAccessDestination = await auth.context.canAccessUpp(body.destinationUppId.trim());
    if (!canAccessDestination) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP destino.", 403);
    }
  }

  try {
    const container = createMovementContainer({
      tenantId: auth.context.user.tenantId,
      accessToken: auth.context.user.accessToken,
    });

    await container.confirmMovementArrivalUseCase.execute({
      tenantId: auth.context.user.tenantId,
      request: {
        movementId: body.movementId.trim(),
        destinationType: body.destinationType,
        destinationUppId: body.destinationUppId?.trim(),
        receivedTags: normalizedReceivedTags,
        incidenceNote: body.incidenceNote,
      },
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "update",
      resource: "producer.movements",
      resourceId: body.movementId.trim(),
      payload: {
        destinationType: body.destinationType,
        destinationUppId: body.destinationUppId?.trim() ?? null,
        receivedTags: normalizedReceivedTags,
        incidenceNote: body.incidenceNote ?? null,
      },
    });

    return apiSuccess({
      movementId: body.movementId.trim(),
      confirmed: true,
    });
  } catch (error) {
    return apiError(
      "PRODUCER_MOVEMENT_CONFIRM_FAILED",
      error instanceof Error ? error.message : "No fue posible confirmar la llegada.",
      400
    );
  }
}
