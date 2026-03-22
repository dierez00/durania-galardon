import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { ROLE_LABELS } from "@/shared/lib/auth";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized, type AuthorizedContext } from "@/server/authz";
import { resolveProducerId } from "@/server/authz/profiles";
import {
  fetchAuthUserDisplayName,
  updateAuthUserDisplayName,
} from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";

interface ProducerProfileBody {
  displayName?: string;
  fullName?: string;
}

async function getProducerProfileSnapshot(context: AuthorizedContext) {
  const provisioning = getSupabaseProvisioningClient();
  const user = context.user;
  const [tenantResult, profileResult, membershipResult, producerResult] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning.from("profiles").select("email").eq("id", user.id).maybeSingle(),
    provisioning
      .from("tenant_memberships")
      .select("id,status,joined_at")
      .eq("tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .maybeSingle(),
    provisioning
      .from("producers")
      .select("id,full_name,curp,status,created_at")
      .eq("owner_tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (tenantResult.error) {
    throw new Error(tenantResult.error.message);
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  if (producerResult.error) {
    throw new Error(producerResult.error.message);
  }

  const accessibleUppIds = await context.getAccessibleUppIds();
  const [uppsResult, accessResult] =
    accessibleUppIds.length > 0
      ? await Promise.all([
          provisioning
            .from("upps")
            .select("id,name,upp_code,status")
            .eq("tenant_id", user.tenantId)
            .in("id", accessibleUppIds)
            .order("name", { ascending: true }),
          provisioning
            .from("user_upp_access")
            .select("upp_id,access_level,status")
            .eq("tenant_id", user.tenantId)
            .eq("user_id", user.id)
            .in("upp_id", accessibleUppIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (uppsResult.error) {
    throw new Error(uppsResult.error.message);
  }

  if (accessResult.error) {
    throw new Error(accessResult.error.message);
  }

  const accessByUppId = new Map(
    (accessResult.data ?? []).map((row) => [
      row.upp_id,
      {
        accessLevel: row.access_level,
        accessStatus: row.status,
      },
    ])
  );

  const displayName =
    (await fetchAuthUserDisplayName(user.id)) ?? user.displayName ?? user.email ?? "Usuario";

  return {
    account: {
      displayName,
      email: profileResult.data?.email ?? user.email,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] ?? user.role,
      tenantName: tenantResult.data?.name ?? user.tenantSlug,
      tenantSlug: tenantResult.data?.slug ?? user.tenantSlug,
      canEditDisplayName: true,
    },
    membership: {
      status: membershipResult.data?.status ?? "unknown",
      joinedAt: membershipResult.data?.joined_at ?? null,
    },
    domainProfile: producerResult.data
      ? {
          id: producerResult.data.id,
          fullName: producerResult.data.full_name,
          curp: producerResult.data.curp,
          status: producerResult.data.status,
          createdAt: producerResult.data.created_at,
          canEdit: context.hasPermission("producer.profile.write"),
        }
      : null,
    scope: {
      accessibleProjects: (uppsResult.data ?? []).map((upp) => {
        const access = accessByUppId.get(upp.id);
        return {
          id: upp.id,
          name: upp.name,
          code: upp.upp_code,
          status: upp.status,
          accessLevel: access?.accessLevel ?? "owner",
          accessStatus: access?.accessStatus ?? "active",
        };
      }),
      totalAccessibleProjects: accessibleUppIds.length,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    resource: "producer.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getProducerProfileSnapshot(auth.context);
    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "PRODUCER_PROFILE_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar el perfil.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    resource: "producer.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerProfileBody;
  try {
    body = (await request.json()) as ProducerProfileBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const displayName = body.displayName?.trim();
  const fullName = body.fullName?.trim();

  if (!displayName && !fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos displayName o fullName.");
  }

  if (displayName) {
    const updated = await updateAuthUserDisplayName(auth.context.user.id, displayName);
    if (!updated) {
      return apiError(
        "PRODUCER_PROFILE_DISPLAY_NAME_UPDATE_FAILED",
        "No fue posible actualizar el nombre visible.",
        400
      );
    }
  }

  if (fullName) {
    if (!auth.context.hasPermission("producer.profile.write")) {
      return apiError(
        "FORBIDDEN",
        "No cuenta con permisos para editar la ficha del productor.",
        403
      );
    }

    const producerId = await resolveProducerId(auth.context.user);
    if (!producerId) {
      return apiError("PRODUCER_PROFILE_NOT_FOUND", "No existe perfil productor asociado.", 404);
    }

    const provisioning = getSupabaseProvisioningClient();
    const producerUpdate = await provisioning
      .from("producers")
      .update({ full_name: fullName })
      .eq("id", producerId);

    if (producerUpdate.error) {
      return apiError("PRODUCER_PROFILE_UPDATE_FAILED", producerUpdate.error.message, 400);
    }

    if (!displayName) {
      const synced = await updateAuthUserDisplayName(auth.context.user.id, fullName);
      if (!synced) {
        return apiError(
          "PRODUCER_PROFILE_DISPLAY_NAME_SYNC_FAILED",
          "No fue posible sincronizar el nombre visible.",
          400
        );
      }
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.profile",
    resourceId: auth.context.user.id,
    payload: {
      displayName: displayName ?? null,
      fullName: fullName ?? null,
    },
  });

  return GET(request);
}
