import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";

interface MvzSettingsBody {
  organizationName?: string;
}

async function getMvzSettingsSnapshot(user: {
  tenantId: string;
  tenantSlug: string;
}) {
  const provisioning = getSupabaseProvisioningClient();
  const [tenantResult, membershipsResult, tenantMvzProfileResult] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId)
      .eq("status", "active"),
    provisioning
      .from("mvz_profiles")
      .select("id")
      .eq("owner_tenant_id", user.tenantId)
      .maybeSingle(),
  ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  if (tenantMvzProfileResult.error) {
    throw new Error(tenantMvzProfileResult.error.message);
  }

  let assignedProjects = 0;
  let lastAssignedAt: string | null = null;
  let upcomingVisits = 0;
  let openIncidents = 0;

  if (tenantMvzProfileResult.data?.id) {
    const [activeAssignmentsResult, latestAssignmentResult] = await Promise.all([
      provisioning
        .from("mvz_upp_assignments")
        .select("upp_id,assigned_at")
        .eq("mvz_profile_id", tenantMvzProfileResult.data.id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false }),
      provisioning
        .from("mvz_upp_assignments")
        .select("assigned_at")
        .eq("mvz_profile_id", tenantMvzProfileResult.data.id)
        .order("assigned_at", { ascending: false })
        .limit(1),
    ]);

    if (activeAssignmentsResult.error) {
      throw new Error(activeAssignmentsResult.error.message);
    }

    if (latestAssignmentResult.error) {
      throw new Error(latestAssignmentResult.error.message);
    }

    const assignedUppIds = (activeAssignmentsResult.data ?? []).map((assignment) => assignment.upp_id);
    assignedProjects = assignedUppIds.length;
    lastAssignedAt = latestAssignmentResult.data?.[0]?.assigned_at ?? null;

    if (assignedUppIds.length > 0) {
      const [upcomingVisitsResult, openIncidentsResult] = await Promise.all([
        provisioning
          .from("mvz_visits")
          .select("id", { count: "exact", head: true })
          .in("upp_id", assignedUppIds)
          .eq("status", "scheduled")
          .gte("scheduled_at", new Date().toISOString()),
        provisioning
          .from("sanitary_incidents")
          .select("id", { count: "exact", head: true })
          .in("upp_id", assignedUppIds)
          .in("status", ["open", "in_progress"]),
      ]);

      if (upcomingVisitsResult.error) {
        throw new Error(upcomingVisitsResult.error.message);
      }

      if (openIncidentsResult.error) {
        throw new Error(openIncidentsResult.error.message);
      }

      upcomingVisits = upcomingVisitsResult.count ?? 0;
      openIncidents = openIncidentsResult.count ?? 0;
    }
  }

  return {
    organization: {
      id: tenantResult.data?.id ?? user.tenantId,
      name: tenantResult.data?.name ?? user.tenantSlug,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? "mvz",
    },
    summary: {
      activeMembers: membershipsResult.count ?? 0,
      assignedProjects,
      lastAssignedAt,
      upcomingVisits,
      openIncidents,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.tenant.read"],
    resource: "mvz.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getMvzSettingsSnapshot({
      tenantId: auth.context.user.tenantId,
      tenantSlug: auth.context.user.tenantSlug,
    });

    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "MVZ_SETTINGS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar configuracion.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.tenant.write"],
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

  if (!organizationName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar organizationName.");
  }

  const provisioning = getSupabaseProvisioningClient();
  const tenantUpdate = await provisioning
    .from("tenants")
    .update({ name: organizationName })
    .eq("id", auth.context.user.tenantId);

  if (tenantUpdate.error) {
    return apiError("MVZ_SETTINGS_TENANT_UPDATE_FAILED", tenantUpdate.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "mvz.settings",
    resourceId: auth.context.user.tenantId,
    payload: {
      organizationName,
    },
  });

  return GET(request);
}
