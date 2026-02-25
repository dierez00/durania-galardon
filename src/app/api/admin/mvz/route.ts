import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
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

  const supabaseAdmin = getSupabaseAdminClient();
  const tenantId = auth.context.user.tenantId;

  const mvzResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("id,user_id,full_name,license_number,status,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (mvzResult.error) {
    return apiError("ADMIN_MVZ_QUERY_FAILED", mvzResult.error.message, 500);
  }

  const mvzRows = mvzResult.data ?? [];
  const mvzIds = mvzRows.map((row) => row.id);

  let assignmentsByMvz = new Map<string, number>();
  let testsByMvz = new Map<string, number>();

  if (mvzIds.length > 0) {
    const [assignmentsResult, testsResult] = await Promise.all([
      supabaseAdmin
        .from("mvz_upp_assignments")
        .select("mvz_profile_id,status")
        .eq("tenant_id", tenantId)
        .in("mvz_profile_id", mvzIds),
      supabaseAdmin
        .from("field_tests")
        .select("mvz_profile_id")
        .eq("tenant_id", tenantId)
        .in("mvz_profile_id", mvzIds),
    ]);

    if (!assignmentsResult.error) {
      assignmentsByMvz = (assignmentsResult.data ?? []).reduce((acc, row) => {
        if (row.status === "active") {
          acc.set(row.mvz_profile_id, (acc.get(row.mvz_profile_id) ?? 0) + 1);
        }
        return acc;
      }, new Map<string, number>());
    }

    if (!testsResult.error) {
      testsByMvz = (testsResult.data ?? []).reduce((acc, row) => {
        acc.set(row.mvz_profile_id, (acc.get(row.mvz_profile_id) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());
    }
  }

  return apiSuccess({
    mvzProfiles: mvzRows.map((mvz) => ({
      ...mvz,
      assignedUpps: assignmentsByMvz.get(mvz.id) ?? 0,
      registeredTests: testsByMvz.get(mvz.id) ?? 0,
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

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("mvz_profiles")
    .insert({
      tenant_id: auth.context.user.tenantId,
      user_id: userId,
      full_name: fullName,
      license_number: licenseNumber,
      status: "active",
    })
    .select("id,user_id,full_name,license_number,status,created_at")
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

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status o fullName para actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("mvz_profiles")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select("id,user_id,full_name,license_number,status,created_at")
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
    payload: {
      status: body.status ?? null,
      fullName: body.fullName?.trim() ?? null,
    },
  });

  return apiSuccess({ mvzProfile: updateResult.data });
}
