import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface ProducerExportBody {
  uppId?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.exports.read"],
    resource: "producer.exports",
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
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,monthly_bucket,created_at,updated_at"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("PRODUCER_EXPORTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ exports: rowsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.exports.write"],
    resource: "producer.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerExportBody;
  try {
    body = (await request.json()) as ProducerExportBody;
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
    .from("export_requests")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: producerId,
      upp_id: uppId,
      requested_by_user_id: auth.context.user.id,
      status: "requested",
      monthly_bucket: new Date().toISOString().slice(0, 10),
      compliance_60_rule: null,
      tb_br_validated: null,
      blue_tag_assigned: null,
    })
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,monthly_bucket,created_at,updated_at"
    )
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "PRODUCER_EXPORT_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear solicitud de exportacion.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.exports",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      status: createResult.data.status,
    },
  });

  return apiSuccess({ exportRequest: createResult.data }, { status: 201 });
}
