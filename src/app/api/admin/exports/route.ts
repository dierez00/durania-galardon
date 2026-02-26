import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface ExportBody {
  id?: string;
  uppId?: string;
  producerId?: string;
  status?: "requested" | "mvz_validated" | "final_approved" | "blocked" | "rejected";
  compliance60Rule?: boolean;
  tbBrValidated?: boolean;
  blueTagAssigned?: boolean;
  blockedReason?: string;
  metrics?: Record<string, unknown>;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.read"],
    resource: "admin.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const tenantId = auth.context.user.tenantId;
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const rowsResult = await supabase
    .from("export_requests")
    .select(
      "id,producer_id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,metrics_json,blocked_reason,created_at,updated_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("ADMIN_EXPORTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  const exportsRows = rowsResult.data ?? [];
  const metrics = exportsRows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc.byStatus[row.status] = (acc.byStatus[row.status] ?? 0) + 1;
      if (row.status === "blocked") {
        acc.blocked += 1;
      }
      if (row.status === "final_approved") {
        acc.approved += 1;
      }
      return acc;
    },
    {
      total: 0,
      approved: 0,
      blocked: 0,
      byStatus: {} as Record<string, number>,
    }
  );

  return apiSuccess({ exports: exportsRows, metrics });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.write"],
    resource: "admin.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  if (!uppId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId.");
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const createResult = await supabase
    .from("export_requests")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: body.producerId?.trim() || null,
      upp_id: uppId,
      requested_by_user_id: auth.context.user.id,
      status: body.status ?? "requested",
      compliance_60_rule: body.compliance60Rule ?? null,
      tb_br_validated: body.tbBrValidated ?? null,
      blue_tag_assigned: body.blueTagAssigned ?? null,
      monthly_bucket: new Date().toISOString().slice(0, 10),
      metrics_json: body.metrics ?? null,
      blocked_reason: body.blockedReason?.trim() || null,
    })
    .select(
      "id,producer_id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,metrics_json,blocked_reason,created_at,updated_at"
    )
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "ADMIN_EXPORT_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear solicitud de exportacion.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.exports",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      status: createResult.data.status,
    },
  });

  return apiSuccess({ exportRequest: createResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.write"],
    resource: "admin.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de export_request.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
    if (body.status === "final_approved") {
      updatePayload.approved_by_admin_user_id = auth.context.user.id;
    }
  }
  if (body.compliance60Rule !== undefined) {
    updatePayload.compliance_60_rule = body.compliance60Rule;
  }
  if (body.tbBrValidated !== undefined) {
    updatePayload.tb_br_validated = body.tbBrValidated;
  }
  if (body.blueTagAssigned !== undefined) {
    updatePayload.blue_tag_assigned = body.blueTagAssigned;
  }
  if (body.blockedReason !== undefined) {
    updatePayload.blocked_reason = body.blockedReason?.trim() || null;
  }
  if (body.metrics !== undefined) {
    updatePayload.metrics_json = body.metrics;
  }
  updatePayload.updated_at = new Date().toISOString();

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const updateResult = await supabase
    .from("export_requests")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select(
      "id,producer_id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,metrics_json,blocked_reason,created_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_EXPORT_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_EXPORT_NOT_FOUND", "No existe solicitud con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.exports",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ exportRequest: updateResult.data });
}
