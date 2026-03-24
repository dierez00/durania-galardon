import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface PatchBody {
  status?: "requested" | "mvz_validated" | "final_approved" | "blocked" | "rejected";
  blockedReason?: string;
  complianceRule60?: boolean;
  tbBrValidated?: boolean;
  blueTagAssigned?: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.read"],
    resource: "admin.exports",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.context.user.tenantId;
  const supabase = getSupabaseAdminClient();

  const result = await supabase
    .from("export_requests")
    .select(
      `id,producer_id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,
       monthly_bucket,metrics_json,blocked_reason,validated_by_mvz_user_id,
       approved_by_admin_user_id,created_at,updated_at,
       producers(full_name),
       upps(upp_code,name)`
    )
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (result.error) {
    return apiError("ADMIN_EXPORT_QUERY_FAILED", result.error.message, 500);
  }
  if (!result.data) {
    return apiError("ADMIN_EXPORT_NOT_FOUND", "No existe solicitud de exportación con ese id.", 404);
  }

  const row = result.data as Record<string, unknown> & {
    producers?: { full_name?: string } | null;
    upps?: { upp_code?: string; name?: string } | null;
    metrics_json?: { animal_ids?: string[]; total_animals?: number; validated_animals?: number } | null;
  };

  const exportacion = {
    id: row.id,
    producerId: row.producer_id,
    uppId: row.upp_id,
    producerName: row.producers?.full_name ?? null,
    uppName: row.upps?.name ?? null,
    uppCode: row.upps?.upp_code ?? null,
    status: row.status,
    complianceRule60: row.compliance_60_rule,
    tbBrValidated: row.tb_br_validated,
    blueTagAssigned: row.blue_tag_assigned,
    monthlyBucket: row.monthly_bucket,
    metricsJson: row.metrics_json ?? null,
    blockedReason: row.blocked_reason,
    validatedByMvzUserId: row.validated_by_mvz_user_id,
    approvedByAdminUserId: row.approved_by_admin_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalAnimals: (row.metrics_json?.animal_ids ?? []).length,
  };

  return apiSuccess({ exportacion });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.write"],
    resource: "admin.exports",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON válido.");
  }

  const validStatuses = ["requested", "mvz_validated", "final_approved", "blocked", "rejected"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return apiError("INVALID_STATUS", "Estado inválido.");
  }

  if (body.status === "blocked" && !body.blockedReason?.trim()) {
    return apiError("BLOCKED_REASON_REQUIRED", "Se requiere motivo de bloqueo.");
  }

  const supabase = getSupabaseAdminClient();

  const updateData: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.blockedReason !== undefined) updateData.blocked_reason = body.blockedReason.trim() || null;
  if (body.complianceRule60 !== undefined) updateData.compliance_60_rule = body.complianceRule60;
  if (body.tbBrValidated !== undefined) updateData.tb_br_validated = body.tbBrValidated;
  if (body.blueTagAssigned !== undefined) updateData.blue_tag_assigned = body.blueTagAssigned;

  if (body.status === "mvz_validated") updateData.validated_by_mvz_user_id = auth.context.user.id;
  if (body.status === "final_approved") updateData.approved_by_admin_user_id = auth.context.user.id;

  const updateResult = await supabase
    .from("export_requests")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId);

  if (updateResult.error) {
    return apiError("ADMIN_EXPORT_UPDATE_FAILED", updateResult.error.message, 500);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.exports",
    resourceId: id,
    payload: { status: body.status },
  });

  return apiSuccess({ updated: true });
}
