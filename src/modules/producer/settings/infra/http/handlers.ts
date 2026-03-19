import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized } from "@/server/authz";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface ProducerSettingsBody {
  organizationName?: string;
  fullName?: string;
}

async function getProducerSettingsSnapshot(user: {
  id: string;
  tenantId: string;
  tenantSlug: string;
}) {
  const provisioning = getSupabaseProvisioningClient();

  const [tenantResult, membershipsResult, documentsResult, producerResult] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId)
      .eq("status", "active"),
    provisioning
      .from("producer_documents")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId),
    provisioning
      .from("producers")
      .select("id,full_name,status,created_at")
      .eq("owner_tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  if (producerResult.error) {
    throw new Error(producerResult.error.message);
  }

  return {
    organization: {
      id: tenantResult.data?.id ?? user.tenantId,
      name: tenantResult.data?.name ?? user.tenantSlug,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? "producer",
    },
    profile: producerResult.data
      ? {
          id: producerResult.data.id,
          fullName: producerResult.data.full_name,
          status: producerResult.data.status,
          createdAt: producerResult.data.created_at,
        }
      : null,
    summary: {
      activeMembers: membershipsResult.count ?? 0,
      personalDocuments: documentsResult.count ?? 0,
      accessibleProjects: 0,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read", "producer.documents.read", "producer.employees.read"],
    resource: "producer.settings",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getProducerSettingsSnapshot({
      id: auth.context.user.id,
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
    roles: ["producer"],
    permissions: ["producer.upp.write"],
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
  const fullName = body.fullName?.trim();

  if (!organizationName && !fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos organizationName o fullName.");
  }

  const provisioning = getSupabaseProvisioningClient();

  if (organizationName) {
    const tenantUpdate = await provisioning
      .from("tenants")
      .update({ name: organizationName })
      .eq("id", auth.context.user.tenantId);

    if (tenantUpdate.error) {
      return apiError("PRODUCER_SETTINGS_TENANT_UPDATE_FAILED", tenantUpdate.error.message, 400);
    }
  }

  if (fullName) {
    const producerId = await resolveProducerId(auth.context.user);
    if (!producerId) {
      return apiError("PRODUCER_PROFILE_NOT_FOUND", "No existe perfil productor asociado.", 404);
    }

    const producerUpdate = await provisioning
      .from("producers")
      .update({ full_name: fullName })
      .eq("id", producerId);

    if (producerUpdate.error) {
      return apiError("PRODUCER_SETTINGS_PROFILE_UPDATE_FAILED", producerUpdate.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.settings",
    resourceId: auth.context.user.tenantId,
    payload: {
      organizationName: organizationName ?? null,
      fullName: fullName ?? null,
    },
  });

  return GET(request);
}
