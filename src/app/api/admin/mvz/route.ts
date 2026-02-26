import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface MvzBody {
  id?: string;
  userId?: string;
  fullName?: string;
  licenseNumber?: string;
  status?: "active" | "inactive";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const rowsResult = await supabaseAdmin
    .from("v_mvz_admin")
    .select("mvz_profile_id,full_name,license_number,mvz_status,active_assignments,tests_last_year,registered_at")
    .order("registered_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("ADMIN_MVZ_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({
    mvzProfiles: (rowsResult.data ?? []).map((row) => ({
      id: row.mvz_profile_id,
      full_name: row.full_name,
      license_number: row.license_number,
      status: row.mvz_status,
      assignedUpps: row.active_assignments ?? 0,
      registeredTests: row.tests_last_year ?? 0,
      created_at: row.registered_at,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzBody;
  try {
    body = (await request.json()) as MvzBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const userId = body.userId?.trim();
  const fullName = body.fullName?.trim();
  const licenseNumber = body.licenseNumber?.trim();

  if (!userId || !fullName || !licenseNumber) {
    return apiError("INVALID_PAYLOAD", "Debe enviar userId, fullName y licenseNumber.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const createResult = await supabaseAdmin
    .from("mvz_profiles")
    .insert({
      owner_tenant_id: auth.context.user.tenantId,
      user_id: userId,
      full_name: fullName,
      license_number: licenseNumber,
      status: "active",
    })
    .select("id,user_id,owner_tenant_id,full_name,license_number,status,created_at")
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "ADMIN_MVZ_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear MVZ.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.mvz",
    resourceId: createResult.data.id,
    payload: { userId, fullName, licenseNumber },
  });

  return apiSuccess({ mvzProfile: createResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzBody;
  try {
    body = (await request.json()) as MvzBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id del MVZ.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.fullName?.trim()) {
    updatePayload.full_name = body.fullName.trim();
  }
  if (body.licenseNumber?.trim()) {
    updatePayload.license_number = body.licenseNumber.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status o fullName para actualizar.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const updateResult = await supabaseAdmin
    .from("mvz_profiles")
    .update(updatePayload)
    .eq("id", id)
    .select("id,user_id,owner_tenant_id,full_name,license_number,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_MVZ_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.mvz",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ mvzProfile: updateResult.data });
}
