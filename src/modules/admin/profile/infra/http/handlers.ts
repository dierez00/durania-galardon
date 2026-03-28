import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { ROLE_LABELS } from "@/shared/lib/auth";
import { requireAuthorized, type AuthorizedContext } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import {
  fetchAuthUserDisplayName,
  updateAuthUserDisplayName,
} from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";

interface AdminProfileBody {
  displayName?: string;
}

async function getAdminProfileSnapshot(context: AuthorizedContext) {
  const provisioning = getSupabaseProvisioningClient();
  const user = context.user;

  const [tenantResult, profileResult, membershipResult] = await Promise.all([
    provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
    provisioning.from("profiles").select("email").eq("id", user.id).maybeSingle(),
    provisioning
      .from("tenant_memberships")
      .select("id,status,joined_at")
      .eq("tenant_id", user.tenantId)
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
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    resource: "admin.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminProfileSnapshot(auth.context);
    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "ADMIN_PROFILE_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar el perfil.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    resource: "admin.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: AdminProfileBody;
  try {
    body = (await request.json()) as AdminProfileBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const displayName = body.displayName?.trim();
  if (!displayName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar displayName.");
  }

  const updated = await updateAuthUserDisplayName(auth.context.user.id, displayName);
  if (!updated) {
    return apiError(
      "ADMIN_PROFILE_DISPLAY_NAME_UPDATE_FAILED",
      "No fue posible actualizar el nombre visible.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.profile",
    resourceId: auth.context.user.id,
    payload: {
      displayName,
    },
  });

  return GET(request);
}
