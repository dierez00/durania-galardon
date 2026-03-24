import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface NormativeBody {
  id?: string;
  key?: string;
  valueJson?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveUntil?: string;
  status?: "active" | "inactive";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.normative.read"],
    resource: "admin.normative",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  const rowsResult = await supabase
    .from("normative_settings")
    .select("id,key,value_json,effective_from,effective_until,status,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("ADMIN_NORMATIVE_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ settings: rowsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.normative.write"],
    resource: "admin.normative",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: NormativeBody;
  try {
    body = (await request.json()) as NormativeBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const key = body.key?.trim();
  const valueJson = body.valueJson;

  if (!key || !valueJson) {
    return apiError("INVALID_PAYLOAD", "Debe enviar key y valueJson.");
  }

  const supabase = getSupabaseAdminClient();
  const insertResult = await supabase
    .from("normative_settings")
    .insert({
      tenant_id: auth.context.user.tenantId,
      key,
      value_json: valueJson,
      effective_from: body.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      effective_until: body.effectiveUntil ?? null,
      status: body.status ?? "active",
      changed_by_user_id: auth.context.user.id,
    })
    .select("id,key,value_json,effective_from,effective_until,status,created_at")
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "ADMIN_NORMATIVE_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible crear parametro normativo.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.normative",
    resourceId: insertResult.data.id,
    payload: {
      key,
      valueJson,
      status: body.status ?? "active",
    },
  });

  return apiSuccess({ setting: insertResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.normative.write"],
    resource: "admin.normative",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: NormativeBody;
  try {
    body = (await request.json()) as NormativeBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id del parametro normativo.");
  }

  const updatePayload: Record<string, unknown> = {
    changed_by_user_id: auth.context.user.id,
  };

  if (body.valueJson !== undefined) {
    updatePayload.value_json = body.valueJson;
  }
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.effectiveUntil !== undefined) {
    updatePayload.effective_until = body.effectiveUntil || null;
  }

  const supabase = getSupabaseAdminClient();
  const updateResult = await supabase
    .from("normative_settings")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select("id,key,value_json,effective_from,effective_until,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_NORMATIVE_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_NORMATIVE_NOT_FOUND", "No existe parametro normativo con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.normative",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ setting: updateResult.data });
}
