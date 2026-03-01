import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createAuthUser, deleteAuthUser } from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import {
  createMembershipAndAssignRole,
  createTenantWithUniqueSlug,
  ensureTenantRole,
  generateTemporaryPassword,
  waitForProfile,
} from "@/server/admin/provisioning";

const MVZ_PERMISSIONS = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.exports.write",
];

interface MvzCreateBody {
  email?: string;
  fullName?: string;
  licenseNumber?: string;
}

interface MvzUpdateBody {
  id?: string;
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
    .select("mvz_profile_id,user_id,full_name,license_number,mvz_status,active_assignments,tests_last_year,registered_at")
    .order("registered_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("ADMIN_MVZ_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({
    mvzProfiles: (rowsResult.data ?? []).map((row) => ({
      id: row.mvz_profile_id,
      user_id: row.user_id,
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

  let body: MvzCreateBody;
  try {
    body = (await request.json()) as MvzCreateBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();
  const licenseNumber = body.licenseNumber?.trim().toUpperCase();

  if (!email || !fullName || !licenseNumber) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email, fullName y licenseNumber.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();

  // Full provisioning flow: auth user → profile → tenant → role → membership → mvz_profile
  const temporaryPassword = generateTemporaryPassword();
  const authResult = await createAuthUser({ email, password: temporaryPassword, emailConfirmed: true });
  if (authResult.error || !authResult.data.user) {
    console.error("[mvz] Auth user create failed:", authResult.error?.message);
    return apiError("ADMIN_MVZ_CREATE_FAILED", authResult.error?.message ?? "No fue posible crear usuario.", 400);
  }

  const userId = authResult.data.user.id;

  try {
    const profileExists = await waitForProfile(userId);
    if (!profileExists) {
      await deleteAuthUser(userId);
      return apiError("ADMIN_MVZ_CREATE_FAILED", "No se pudo confirmar perfil del usuario.", 500);
    }

    const tenant = await createTenantWithUniqueSlug({
      type: "mvz",
      fullName,
      email,
      createdByUserId: auth.context.user.id,
    });

    const roleId = await ensureTenantRole({
      tenantId: tenant.tenantId,
      roleKey: "mvz_government",
      roleName: "MVZ Gobierno",
      permissions: MVZ_PERMISSIONS,
    });

    await createMembershipAndAssignRole({
      tenantId: tenant.tenantId,
      userId,
      roleId,
      invitedByUserId: auth.context.user.id,
      assignedByUserId: auth.context.user.id,
    });

    const mvzInsert = await supabaseAdmin
      .from("mvz_profiles")
      .insert({
        owner_tenant_id: tenant.tenantId,
        user_id: userId,
        full_name: fullName,
        license_number: licenseNumber,
        status: "active",
      })
      .select("id,user_id,owner_tenant_id,full_name,license_number,status,created_at")
      .single();

    if (mvzInsert.error || !mvzInsert.data) {
      throw new Error(mvzInsert.error?.message ?? "No fue posible crear MVZ.");
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.mvz",
      resourceId: mvzInsert.data.id,
      payload: { email, fullName, licenseNumber, tenantId: tenant.tenantId },
    });

    return apiSuccess(
      {
        mvzProfile: mvzInsert.data,
        tenantId: tenant.tenantId,
        temporaryPassword,
      },
      { status: 201 }
    );
  } catch (err) {
    // Rollback: delete Auth user (cascade will remove profile)
    await deleteAuthUser(userId);
    return apiError(
      "ADMIN_MVZ_CREATE_FAILED",
      err instanceof Error ? err.message : "No fue posible crear MVZ.",
      400
    );
  }
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

  let body: MvzUpdateBody;
  try {
    body = (await request.json()) as MvzUpdateBody;
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
