import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { isAppRole, isMvzViewRole } from "@/shared/lib/auth";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface UpdateStatusBody {
  status?: "active" | "inactive";
}

const VALID_STATUS = new Set(["active", "inactive"]);

type TenantRoleRow = {
  tenant_role:
    | {
        key: string;
      }
    | {
        key: string;
      }[]
    | null;
};

function extractRoleKey(data: TenantRoleRow[] | null): string | null {
  const row = (data ?? [])[0];
  if (!row?.tenant_role) {
    return null;
  }

  const value = Array.isArray(row.tenant_role)
    ? row.tenant_role[0]?.key
    : row.tenant_role.key;

  return value ?? null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.update"],
    resource: "admin.users.status",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!id) {
    return apiError("INVALID_ID", "Debe indicar id de usuario.");
  }

  let body: UpdateStatusBody;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const status = body.status;
  if (!status || !VALID_STATUS.has(status)) {
    return apiError("INVALID_STATUS", "status debe ser active o inactive.");
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("user_id", id)
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return apiError("USER_NOT_FOUND", "No existe usuario en este tenant con ese id.", 404);
  }

  const roleResult = await supabase
    .from("tenant_user_roles")
    .select("tenant_role:tenant_roles(key)")
    .eq("membership_id", membershipResult.data.id);

  if (roleResult.error) {
    return apiError("ROLE_QUERY_FAILED", roleResult.error.message, 500);
  }

  const roleKey = extractRoleKey((roleResult.data ?? []) as TenantRoleRow[]);

  const updateProfileResult = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id);
  if (updateProfileResult.error) {
    return apiError("PROFILE_STATUS_UPDATE_FAILED", updateProfileResult.error.message, 400);
  }

  const updateMembershipResult = await supabase
    .from("tenant_memberships")
    .update({ status: status === "active" ? "active" : "inactive" })
    .eq("id", membershipResult.data.id);

  if (updateMembershipResult.error) {
    return apiError("MEMBERSHIP_STATUS_UPDATE_FAILED", updateMembershipResult.error.message, 400);
  }

  if (roleKey === "producer") {
    const updateProducer = await supabase
      .from("producers")
      .update({ status })
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", id);

    if (updateProducer.error) {
      return apiError("PRODUCER_STATUS_UPDATE_FAILED", updateProducer.error.message, 400);
    }
  }

  if (roleKey && isAppRole(roleKey) && isMvzViewRole(roleKey)) {
    const updateMvz = await supabase
      .from("mvz_profiles")
      .update({ status })
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", id);

    if (updateMvz.error) {
      return apiError("MVZ_STATUS_UPDATE_FAILED", updateMvz.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "status_change",
    resource: "admin.users",
    resourceId: id,
    payload: { status, roleKey: roleKey ?? null },
  });

  return apiSuccess({
    id,
    status,
  });
}
