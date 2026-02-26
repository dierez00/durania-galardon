import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface QuarantineBody {
  id?: string;
  uppId?: string;
  title?: string;
  reason?: string;
  quarantineType?: "state" | "operational";
  geojson?: Record<string, unknown>;
  epidemiologicalNote?: string;
  status?: "active" | "released" | "suspended";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.read"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rowsResult = await supabaseAdmin
    .from("state_quarantines")
    .select(
      "id,upp_id,status,quarantine_type,title,reason,geojson,started_at,released_at,epidemiological_note,created_at"
    )
    .eq("declared_by_tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("ADMIN_QUARANTINES_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ quarantines: rowsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.write"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: QuarantineBody;
  try {
    body = (await request.json()) as QuarantineBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const title = body.title?.trim();
  if (!title) {
    return apiError("INVALID_PAYLOAD", "Debe enviar title.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("state_quarantines")
    .insert({
      declared_by_tenant_id: auth.context.user.tenantId,
      upp_id: body.uppId?.trim() || null,
      status: "active",
      quarantine_type: body.quarantineType ?? "state",
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
      "ADMIN_QUARANTINE_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear cuarentena.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.quarantines",
    resourceId: createResult.data.id,
    payload: {
      title,
      uppId: body.uppId?.trim() || null,
      quarantineType: body.quarantineType ?? "state",
    },
  });

  return apiSuccess({ quarantine: createResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.write"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: QuarantineBody;
  try {
    body = (await request.json()) as QuarantineBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de cuarentena.");
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

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("state_quarantines")
    .update(updatePayload)
    .eq("declared_by_tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select(
      "id,upp_id,status,quarantine_type,title,reason,geojson,started_at,released_at,epidemiological_note,created_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_QUARANTINE_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_QUARANTINE_NOT_FOUND", "No existe cuarentena con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.quarantines",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ quarantine: updateResult.data });
}
