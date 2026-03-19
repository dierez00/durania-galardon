import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface MvzSettingsBody {
  organizationName?: string;
  fullName?: string;
}

async function getMvzSettingsSnapshot(user: {
  id: string;
  tenantId: string;
  tenantSlug: string;
}) {
  const provisioning = getSupabaseProvisioningClient();
  const [tenantResult, mvzProfileResult] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning
      .from("mvz_profiles")
      .select("id,full_name,license_number,status,created_at")
      .eq("owner_tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }

  if (mvzProfileResult.error) {
    throw new Error(mvzProfileResult.error.message);
  }

  if (!mvzProfileResult.data) {
    throw new Error("MVZ_PROFILE_NOT_FOUND");
  }

  const [assignmentsResult, activeAssignmentsResult] = await Promise.all([
    provisioning
      .from("mvz_upp_assignments")
      .select("assigned_at", { count: "exact" })
      .eq("mvz_profile_id", mvzProfileResult.data.id)
      .order("assigned_at", { ascending: false })
      .limit(1),
    provisioning
      .from("mvz_upp_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mvz_profile_id", mvzProfileResult.data.id)
      .eq("status", "active"),
  ]);

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  if (activeAssignmentsResult.error) {
    throw new Error(activeAssignmentsResult.error.message);
  }

  return {
    organization: {
      id: tenantResult.data?.id ?? user.tenantId,
      name: tenantResult.data?.name ?? user.tenantSlug,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? "mvz",
    },
    profile: {
      id: mvzProfileResult.data.id,
      fullName: mvzProfileResult.data.full_name,
      licenseNumber: mvzProfileResult.data.license_number,
      status: mvzProfileResult.data.status,
      createdAt: mvzProfileResult.data.created_at,
    },
    summary: {
      assignedProjects: activeAssignmentsResult.count ?? 0,
      lastAssignedAt: assignmentsResult.data?.[0]?.assigned_at ?? null,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read", "mvz.assignments.read"],
    resource: "mvz.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getMvzSettingsSnapshot({
      id: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      tenantSlug: auth.context.user.tenantSlug,
    });

    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "MVZ_PROFILE_NOT_FOUND"
        ? "No existe perfil MVZ activo para el usuario."
        : error instanceof Error
          ? error.message
          : "No fue posible cargar configuracion.";

    return apiError("MVZ_SETTINGS_QUERY_FAILED", message, 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read", "mvz.assignments.read"],
    resource: "mvz.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzSettingsBody;
  try {
    body = (await request.json()) as MvzSettingsBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const organizationName = body.organizationName?.trim();
  const fullName = body.fullName?.trim();

  if (!organizationName && !fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos organizationName o fullName.");
  }

  if (organizationName && auth.context.user.role !== "mvz_government") {
    return apiError(
      "FORBIDDEN",
      "Solo MVZ Gobierno puede actualizar el nombre organizacional.",
      403
    );
  }

  const provisioning = getSupabaseProvisioningClient();

  if (organizationName) {
    const tenantUpdate = await provisioning
      .from("tenants")
      .update({ name: organizationName })
      .eq("id", auth.context.user.tenantId);

    if (tenantUpdate.error) {
      return apiError("MVZ_SETTINGS_TENANT_UPDATE_FAILED", tenantUpdate.error.message, 400);
    }
  }

  if (fullName) {
    const mvzProfileId = await resolveMvzProfileId(auth.context.user);
    if (!mvzProfileId) {
      return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 404);
    }

    const profileUpdate = await provisioning
      .from("mvz_profiles")
      .update({ full_name: fullName })
      .eq("id", mvzProfileId);

    if (profileUpdate.error) {
      return apiError("MVZ_SETTINGS_PROFILE_UPDATE_FAILED", profileUpdate.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "mvz.settings",
    resourceId: auth.context.user.tenantId,
    payload: {
      organizationName: organizationName ?? null,
      fullName: fullName ?? null,
    },
  });

  return GET(request);
}
