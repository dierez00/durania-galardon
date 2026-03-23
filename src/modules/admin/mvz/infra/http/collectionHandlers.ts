import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import {
  createMembershipAndAssignRole,
  createTenantWithUniqueSlug,
  ensureAuthUserForEmail,
  ensureTenantRole,
} from "@/server/admin/provisioning";
import { ServerAdminMvzRepository } from "@/modules/admin/mvz/infra/supabase/ServerAdminMvzRepository";
import { deleteAuthUser } from "@/server/auth/provisioning";
import { buildSetPasswordRedirectUrl } from "@/modules/auth/shared/redirects";

const MVZ_PERMISSIONS = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.exports.write",
] as const;

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

  const url = new URL(request.url);
  const repository = new ServerAdminMvzRepository(auth.context.user.id);

  try {
    const result = await repository.list({
      search: url.searchParams.get("search")?.trim() ?? "",
      status: url.searchParams.get("status")?.trim() ?? "",
      dateFrom: url.searchParams.get("dateFrom")?.trim() ?? "",
      dateTo: url.searchParams.get("dateTo")?.trim() ?? "",
      page: Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10)),
      limit: Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10))),
      sortBy: (url.searchParams.get("sortBy") ?? "registered_at") as
        | "registered_at"
        | "active_assignments"
        | "tests_last_year",
      sortDir: (url.searchParams.get("sortDir") ?? "desc") as "asc" | "desc",
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar MVZ.",
      500
    );
  }
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
  let authUser: { userId: string; invitationSent: boolean };
  let createdTenantId: string | null = null;

  try {
    authUser = await ensureAuthUserForEmail({
      email,
      redirectTo: buildSetPasswordRedirectUrl(),
    });
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear o invitar al usuario.",
      400
    );
  }

  try {
    const tenant = await createTenantWithUniqueSlug({
      type: "mvz",
      fullName,
      email,
      createdByUserId: auth.context.user.id,
    });
    createdTenantId = tenant.tenantId;

    const roleId = await ensureTenantRole({
      tenantId: tenant.tenantId,
      roleKey: "mvz_government",
      roleName: "MVZ Gobierno",
      permissions: [...MVZ_PERMISSIONS],
    });

    await createMembershipAndAssignRole({
      tenantId: tenant.tenantId,
      userId: authUser.userId,
      roleId,
      invitedByUserId: auth.context.user.id,
      assignedByUserId: auth.context.user.id,
    });

    const mvzInsert = await supabaseAdmin
      .from("mvz_profiles")
      .insert({
        owner_tenant_id: tenant.tenantId,
        user_id: authUser.userId,
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
      payload: {
        email,
        fullName,
        licenseNumber,
        tenantId: tenant.tenantId,
        invitationSent: authUser.invitationSent,
      },
    });

    return apiSuccess(
      {
        mvzProfile: mvzInsert.data,
        tenantId: tenant.tenantId,
        invitationSent: authUser.invitationSent,
      },
      { status: 201 }
    );
  } catch (error) {
    if (typeof createdTenantId === "string") {
      await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
    }
    if (authUser.invitationSent) {
      await deleteAuthUser(authUser.userId);
    }
    return apiError(
      "ADMIN_MVZ_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear MVZ.",
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
