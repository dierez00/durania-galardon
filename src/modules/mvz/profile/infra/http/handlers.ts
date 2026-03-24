import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { ROLE_LABELS } from "@/shared/lib/auth";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { requireAuthorized, type AuthorizedContext } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import {
  fetchAuthUserDisplayName,
  updateAuthUserDisplayName,
} from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";

interface MvzProfileBody {
  displayName?: string;
  fullName?: string;
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getMvzProfileSnapshot(context: AuthorizedContext) {
  const provisioning = getSupabaseProvisioningClient();
  const user = context.user;
  const [tenantResult, profileResult, membershipResult, currentMvzProfileResult] =
    await Promise.all([
      provisioning.from("tenants").select("id,name,slug,type").eq("id", user.tenantId).maybeSingle(),
      provisioning.from("profiles").select("email").eq("id", user.id).maybeSingle(),
      provisioning
        .from("tenant_memberships")
        .select("id,status,joined_at")
        .eq("tenant_id", user.tenantId)
        .eq("user_id", user.id)
        .maybeSingle(),
      provisioning
        .from("mvz_profiles")
        .select("id,full_name,license_number,status,created_at")
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

  if (currentMvzProfileResult.error) {
    throw new Error(currentMvzProfileResult.error.message);
  }

  const assignmentsResult = currentMvzProfileResult.data
    ? await provisioning
        .from("mvz_upp_assignments")
        .select("id,upp_id,status,assigned_at,upps(id,name,upp_code,status,producers(full_name))")
        .eq("mvz_profile_id", currentMvzProfileResult.data.id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
    : { data: [], error: null };

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
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
    domainProfile: currentMvzProfileResult.data
      ? {
          id: currentMvzProfileResult.data.id,
          fullName: currentMvzProfileResult.data.full_name,
          licenseNumber: currentMvzProfileResult.data.license_number,
          status: currentMvzProfileResult.data.status,
          createdAt: currentMvzProfileResult.data.created_at,
          canEdit: context.hasPermission("mvz.profile.write"),
        }
      : null,
    scope: {
      assignedProjects: (assignmentsResult.data ?? []).map((assignment) => {
        const upp = getSingleRelation(assignment.upps);
        const producer = getSingleRelation(upp?.producers);

        return {
          id: assignment.upp_id,
          status: assignment.status,
          assignedAt: assignment.assigned_at,
          name: upp?.name ?? assignment.upp_id,
          code: upp?.upp_code ?? null,
          ranchStatus: upp?.status ?? "unknown",
          producerName: producer?.full_name ?? null,
        };
      }),
      totalAssignedProjects: (assignmentsResult.data ?? []).length,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    resource: "mvz.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const snapshot = await getMvzProfileSnapshot(auth.context);
    return apiSuccess({
      ...snapshot,
      permissions: auth.context.permissions,
    });
  } catch (error) {
    return apiError(
      "MVZ_PROFILE_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar el perfil.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    resource: "mvz.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzProfileBody;
  try {
    body = (await request.json()) as MvzProfileBody;
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
        "MVZ_PROFILE_DISPLAY_NAME_UPDATE_FAILED",
        "No fue posible actualizar el nombre visible.",
        400
      );
    }
  }

  if (fullName) {
    if (!auth.context.hasPermission("mvz.profile.write")) {
      return apiError(
        "FORBIDDEN",
        "No cuenta con permisos para editar la ficha profesional MVZ.",
        403
      );
    }

    const mvzProfileId = await resolveMvzProfileId(auth.context.user);
    if (!mvzProfileId) {
      return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ asociado al usuario.", 404);
    }

    const provisioning = getSupabaseProvisioningClient();
    const profileUpdate = await provisioning
      .from("mvz_profiles")
      .update({ full_name: fullName })
      .eq("id", mvzProfileId);

    if (profileUpdate.error) {
      return apiError("MVZ_PROFILE_UPDATE_FAILED", profileUpdate.error.message, 400);
    }

    if (!displayName) {
      const synced = await updateAuthUserDisplayName(auth.context.user.id, fullName);
      if (!synced) {
        return apiError(
          "MVZ_PROFILE_DISPLAY_NAME_SYNC_FAILED",
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
    resource: "mvz.profile",
    resourceId: auth.context.user.id,
    payload: {
      displayName: displayName ?? null,
      fullName: fullName ?? null,
    },
  });

  return GET(request);
}
