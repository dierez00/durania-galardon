import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";

interface ProducerSettingsBody {
  organizationName?: string;
}

async function getProducerSettingsSnapshot(user: {
  tenantId: string;
  tenantSlug: string;
}) {
  const provisioning = getSupabaseProvisioningClient();

  const [tenantResult, membershipsResult, pendingDocumentsResult, rejectedDocumentsResult] =
    await Promise.all([
      provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
      provisioning
        .from("tenant_memberships")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", user.tenantId)
        .eq("status", "active"),
      provisioning
        .from("producer_documents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", user.tenantId)
        .eq("is_current", true)
        .eq("status", "pending"),
      provisioning
        .from("producer_documents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", user.tenantId)
        .eq("is_current", true)
        .eq("status", "rejected"),
    ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  if (pendingDocumentsResult.error) {
    throw new Error(pendingDocumentsResult.error.message);
  }

  if (rejectedDocumentsResult.error) {
    throw new Error(rejectedDocumentsResult.error.message);
  }

  return {
    organization: {
      id: tenantResult.data?.id ?? user.tenantId,
      name: tenantResult.data?.name ?? user.tenantSlug,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? "producer",
    },
    summary: {
      activeMembers: membershipsResult.count ?? 0,
      accessibleProjects: 0,
      pendingDocuments: pendingDocumentsResult.count ?? 0,
      rejectedDocuments: rejectedDocumentsResult.count ?? 0,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.tenant.read", "producer.tenant.write"],
    resource: "producer.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getProducerSettingsSnapshot({
      tenantId: auth.context.user.tenantId,
      tenantSlug: auth.context.user.tenantSlug,
    });

    const accessibleUppIds = await auth.context.getAccessibleUppIds();

    return apiSuccess({
      ...snapshot,
      summary: {
        ...snapshot.summary,
        accessibleProjects: accessibleUppIds.length,
      },
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "PRODUCER_SETTINGS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar configuracion.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.tenant.write"],
    resource: "producer.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerSettingsBody;
  try {
    body = (await request.json()) as ProducerSettingsBody;
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
    return apiError("PRODUCER_SETTINGS_TENANT_UPDATE_FAILED", tenantUpdate.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.settings",
    resourceId: auth.context.user.tenantId,
    payload: {
      organizationName,
    },
  });

  return GET(request);
}
