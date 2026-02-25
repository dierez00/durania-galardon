import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface MvzQuarantineBody {
  id?: string;
  uppId?: string;
  title?: string;
  reason?: string;
  status?: "active" | "released" | "suspended";
  epidemiologicalNote?: string;
  geojson?: Record<string, unknown>;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.quarantines.read"],
    resource: "mvz.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ quarantines: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rowsResult = await supabaseAdmin
    .from("state_quarantines")
    .select(
      "id,upp_id,status,quarantine_type,title,reason,geojson,started_at,released_at,epidemiological_note,created_at"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("quarantine_type", "operational")
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_QUARANTINES_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ quarantines: rowsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.quarantines.write"],
    resource: "mvz.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzQuarantineBody;
  try {
    body = (await request.json()) as MvzQuarantineBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  const title = body.title?.trim();
  if (!uppId || !title) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId y title.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("state_quarantines")
    .insert({
      tenant_id: auth.context.user.tenantId,
      upp_id: uppId,
      status: body.status ?? "active",
      quarantine_type: "operational",
      title,
      reason: body.reason?.trim() || null,
      geojson: body.geojson ?? null,
      epidemiological_note: body.epidemiologicalNote?.trim() || null,
      created_by_user_id: auth.context.user.id,
    })
    .select(
      "id,upp_id,status,quarantine_type,title,reason,geojson,started_at,released_at,epidemiological_note,created_at"
    )
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "MVZ_QUARANTINE_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible activar cuarentena operativa.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "mvz.quarantines",
    resourceId: createResult.data.id,
    payload: { uppId, title },
  });

  return apiSuccess({ quarantine: createResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.quarantines.write"],
    resource: "mvz.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzQuarantineBody;
  try {
    body = (await request.json()) as MvzQuarantineBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de cuarentena.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const lookup = await supabaseAdmin
    .from("state_quarantines")
    .select("id,upp_id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return apiError("MVZ_QUARANTINE_NOT_FOUND", "No existe cuarentena con ese id.", 404);
  }

  const canAccess = await auth.context.canAccessUpp(lookup.data.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la cuarentena solicitada.", 403);
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
    if (body.status === "released") {
      updatePayload.released_at = new Date().toISOString();
      updatePayload.released_by_user_id = auth.context.user.id;
    }
  }
  if (body.epidemiologicalNote !== undefined) {
    updatePayload.epidemiological_note = body.epidemiologicalNote?.trim() || null;
  }
  if (body.geojson !== undefined) {
    updatePayload.geojson = body.geojson;
  }

  const updateResult = await supabaseAdmin
    .from("state_quarantines")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select(
      "id,upp_id,status,quarantine_type,title,reason,geojson,started_at,released_at,epidemiological_note,created_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_QUARANTINE_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_QUARANTINE_NOT_FOUND", "No existe cuarentena con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "mvz.quarantines",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ quarantine: updateResult.data });
}
