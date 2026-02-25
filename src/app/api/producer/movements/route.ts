import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface MovementBody {
  uppId?: string;
  movementDate?: string;
  routeNote?: string;
}

function createMovementQr(id: string): string {
  return `REEMO-${id.slice(0, 8).toUpperCase()}`;
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

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ movements: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rowsResult = await supabaseAdmin
    .from("movement_requests")
    .select("id,upp_id,status,qr_code,route_note,incidence_note,movement_date,created_at,updated_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("PRODUCER_MOVEMENTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ movements: rowsResult.data ?? [] });
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
  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("movement_requests")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: producerId,
      upp_id: uppId,
      requested_by_user_id: auth.context.user.id,
      status: "requested",
      route_note: body.routeNote?.trim() || null,
      movement_date: body.movementDate ?? null,
    })
    .select("id,upp_id,status,qr_code,route_note,incidence_note,movement_date,created_at,updated_at")
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "PRODUCER_MOVEMENT_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear solicitud de movilizacion.",
      400
    );
  }

  const qrCode = createMovementQr(createResult.data.id);
  await supabaseAdmin
    .from("movement_requests")
    .update({ qr_code: qrCode, updated_at: new Date().toISOString() })
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", createResult.data.id);

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.movements",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      movementDate: body.movementDate ?? null,
      qrCode,
    },
  });

  return apiSuccess(
    {
      movement: {
        ...createResult.data,
        qr_code: qrCode,
      },
    },
    { status: 201 }
  );
}
