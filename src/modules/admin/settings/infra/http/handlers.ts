import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface AdminSettingsBody {
  organizationName?: string;
}

async function getAdminSettingsSnapshot(user: {
  tenantId: string;
  tenantSlug: string;
}) {
  const provisioning = getSupabaseProvisioningClient();

  const [
    tenantResult,
    membershipsResult,
    producersResult,
    mvzResult,
    quarantinesResult,
    appointmentsResult,
    exportsResult,
  ] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId)
      .eq("status", "active"),
    provisioning.from("v_producers_admin").select("producer_id,producer_status"),
    provisioning.from("v_mvz_admin").select("mvz_profile_id,mvz_status"),
    provisioning
      .from("state_quarantines")
      .select("id", { count: "exact", head: true })
      .eq("declared_by_tenant_id", user.tenantId)
      .eq("status", "active"),
    provisioning
      .from("appointment_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId)
      .in("status", ["requested", "contacted"]),
    provisioning
      .from("export_requests")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("status", ["requested", "mvz_validated"]),
  ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }
  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }
  if (producersResult.error) {
    throw new Error(producersResult.error.message);
  }
  if (mvzResult.error) {
    throw new Error(mvzResult.error.message);
  }
  if (quarantinesResult.error) {
    throw new Error(quarantinesResult.error.message);
  }
  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message);
  }
  if (exportsResult.error) {
    throw new Error(exportsResult.error.message);
  }

  const producers = (producersResult.data ?? []) as Array<{ producer_status: string | null }>;
  const mvzProfiles = (mvzResult.data ?? []) as Array<{ mvz_status: string | null }>;

  return {
    organization: {
      id: tenantResult.data?.id ?? user.tenantId,
      name: tenantResult.data?.name ?? user.tenantSlug,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? "government",
    },
    summary: {
      activeMembers: membershipsResult.count ?? 0,
      activeProducers: producers.filter((row) => row.producer_status === "active").length,
      activeMvz: mvzProfiles.filter((row) => row.mvz_status === "active").length,
      activeQuarantines: quarantinesResult.count ?? 0,
      pendingAppointments: appointmentsResult.count ?? 0,
      pendingExports: exportsResult.count ?? 0,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.tenant.read", "admin.tenant.write"],
    resource: "admin.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminSettingsSnapshot({
      tenantId: auth.context.user.tenantId,
      tenantSlug: auth.context.user.tenantSlug,
    });

    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "ADMIN_SETTINGS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar configuracion.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.tenant.write"],
    resource: "admin.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: AdminSettingsBody;
  try {
    body = (await request.json()) as AdminSettingsBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const organizationName = body.organizationName?.trim();
  if (!organizationName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar organizationName.");
  }

  const provisioning = getSupabaseProvisioningClient();
  const tenantUpdate = await provisioning
    .from("tenants")
    .update({ name: organizationName })
    .eq("id", auth.context.user.tenantId);

  if (tenantUpdate.error) {
    return apiError("ADMIN_SETTINGS_TENANT_UPDATE_FAILED", tenantUpdate.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.settings",
    resourceId: auth.context.user.tenantId,
    payload: {
      organizationName,
    },
  });

  return GET(request);
}
