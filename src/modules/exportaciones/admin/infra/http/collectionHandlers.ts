import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
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

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20") || 20));
  const sortBy = url.searchParams.get("sortBy") ?? "created_at";
  const sortDir = url.searchParams.get("sortDir") ?? "desc";
  const search = url.searchParams.get("search")?.trim() ?? "";
  const statusFilter = url.searchParams.get("status")?.trim() ?? "";
  const dateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = url.searchParams.get("dateTo")?.trim() ?? "";

  const VALID_SORT = ["created_at", "status", "monthly_bucket"];
  const orderField = VALID_SORT.includes(sortBy) ? sortBy : "created_at";
  const ascending = sortDir === "asc";

  const supabase = getSupabaseAdminClient();

  // If search provided, first resolve matching UPP IDs
  let uppIdFilter: string[] | null = null;
  if (search) {
    const uppSearch = await supabase
      .from("upps")
      .select("id")
      .or(`name.ilike.%${search}%,upp_code.ilike.%${search}%`);
    uppIdFilter = (uppSearch.data ?? []).map((u: { id: string }) => u.id);
    if (uppIdFilter.length === 0) {
      return apiSuccess({ exports: [], total: 0, page, limit });
    }
  }

  let query = supabase
    .from("export_requests")
    .select(
      "id,producer_id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,metrics_json,blocked_reason,created_at,updated_at,producers(full_name),upps(upp_code,name)",
      { count: "exact" }
    );

  if (statusFilter) query = query.eq("status", statusFilter);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59Z`);
  if (uppIdFilter !== null) query = query.in("upp_id", uppIdFilter);

  const from = (page - 1) * limit;
  const result = await query
    .order(orderField, { ascending })
    .range(from, from + limit - 1);

  if (result.error) {
    return apiError("ADMIN_EXPORTS_QUERY_FAILED", result.error.message, 500);
  }

  type ExportRow = {
    id: string;
    producer_id: string | null;
    upp_id: string | null;
    status: string;
    compliance_60_rule: boolean | null;
    tb_br_validated: boolean | null;
    blue_tag_assigned: boolean | null;
    monthly_bucket: string | null;
    metrics_json: Record<string, unknown> | null;
    blocked_reason: string | null;
    created_at: string;
    updated_at: string | null;
    producers?: { full_name?: string } | null;
    upps?: { upp_code?: string; name?: string } | null;
  };

  const exports = (result.data ?? []).map((row) => {
    const r = row as ExportRow;
    return {
      id: r.id,
      producer_id: r.producer_id,
      upp_id: r.upp_id,
      producer_name: r.producers?.full_name ?? null,
      upp_name: r.upps?.name ?? null,
      status: r.status,
      compliance_60_rule: r.compliance_60_rule,
      tb_br_validated: r.tb_br_validated,
      blue_tag_assigned: r.blue_tag_assigned,
      monthly_bucket: r.monthly_bucket,
      metrics_json: r.metrics_json ?? null,
      blocked_reason: r.blocked_reason,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return apiSuccess({ exports, total: result.count ?? exports.length, page, limit });
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

  const supabase = getSupabaseAdminClient();
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

  const supabase = getSupabaseAdminClient();
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
