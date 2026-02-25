import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface MvzExportBody {
  id?: string;
  tbBrValidated?: boolean;
  blueTagAssigned?: boolean;
  status?: "requested" | "mvz_validated" | "blocked";
  blockedReason?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.exports.read"],
    resource: "mvz.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ exports: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rowsResult = await supabaseAdmin
    .from("export_requests")
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,created_at,updated_at"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_EXPORTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ exports: rowsResult.data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.exports.write"],
    resource: "mvz.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzExportBody;
  try {
    body = (await request.json()) as MvzExportBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de export_request.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const lookup = await supabaseAdmin
    .from("export_requests")
    .select("id,upp_id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return apiError("MVZ_EXPORT_NOT_FOUND", "No existe export_request con ese id.", 404);
  }

  const canAccess = await auth.context.canAccessUpp(lookup.data.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP de esta exportacion.", 403);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    validated_by_mvz_user_id: auth.context.user.id,
  };

  if (body.tbBrValidated !== undefined) {
    updatePayload.tb_br_validated = body.tbBrValidated;
  }
  if (body.blueTagAssigned !== undefined) {
    updatePayload.blue_tag_assigned = body.blueTagAssigned;
  }
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.blockedReason !== undefined) {
    updatePayload.blocked_reason = body.blockedReason?.trim() || null;
  }

  const updateResult = await supabaseAdmin
    .from("export_requests")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,created_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_EXPORT_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_EXPORT_NOT_FOUND", "No existe export_request con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "mvz.exports",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ exportRequest: updateResult.data });
}
