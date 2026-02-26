import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { isAppRole, type AppRole } from "@/shared/lib/auth";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface CreateMembershipBody {
  email?: string;
  roleKey?: AppRole;
  status?: "active" | "inactive" | "suspended";
}

type MembershipRoleRow = {
  membership_id: string;
  tenant_role:
    | {
        key: string;
        name: string;
      }
    | {
        key: string;
        name: string;
      }[]
    | null;
};

function pickRole(data: MembershipRoleRow[] | null): { key: string | null; name: string | null } {
  const row = (data ?? [])[0];
  if (!row?.tenant_role) {
    return { key: null, name: null };
  }

  const value = Array.isArray(row.tenant_role) ? row.tenant_role[0] : row.tenant_role;
  return {
    key: value?.key ?? null,
    name: value?.name ?? null,
  };
}

async function listMemberships(tenantId: string, accessToken: string) {
  const supabase = createSupabaseRlsServerClient(accessToken);
  const membershipsResult = await supabase
    .from("tenant_memberships")
    .select("id,user_id,status,joined_at")
    .eq("tenant_id", tenantId)
    .order("joined_at", { ascending: false });

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  const memberships = membershipsResult.data ?? [];
  if (memberships.length === 0) {
    return [];
  }

  const membershipIds = memberships.map((membership) => membership.id);
  const userIds = memberships.map((membership) => membership.user_id);

  const [profilesResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,status,created_at")
      .in("id", userIds),
    supabase
      .from("tenant_user_roles")
      .select("membership_id,tenant_role:tenant_roles(key,name)")
      .in("membership_id", membershipIds),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));

  const roleByMembership = new Map<string, { key: string | null; name: string | null }>();
  ((rolesResult.data ?? []) as MembershipRoleRow[]).forEach((row) => {
    if (!roleByMembership.has(row.membership_id)) {
      roleByMembership.set(row.membership_id, pickRole([row]));
    }
  });

  return memberships
    .map((membership) => {
      const profile = profileById.get(membership.user_id);
      if (!profile) {
        return null;
      }

      const roleInfo = roleByMembership.get(membership.id) ?? { key: null, name: null };
      return {
        id: membership.id,
        userId: membership.user_id,
        email: profile.email,
        profileStatus: profile.status,
        membershipStatus: membership.status,
        joinedAt: membership.joined_at,
        roleKey: roleInfo.key,
        roleName: roleInfo.name,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.read"],
    resource: "tenant.iam.memberships",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const memberships = await listMemberships(
      auth.context.user.tenantId,
      auth.context.user.accessToken
    );
    return apiSuccess({ memberships });
  } catch (error) {
    return apiError(
      "MEMBERSHIPS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar membresias.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.create", "admin.users.roles"],
    requireAllPermissions: true,
    resource: "tenant.iam.memberships",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: CreateMembershipBody;
  try {
    body = (await request.json()) as CreateMembershipBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const roleKey = body.roleKey;
  const status = body.status ?? "active";

  if (!email || !roleKey || !isAppRole(roleKey)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email y roleKey valido.");
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  const profileResult = await supabase
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (profileResult.error) {
    return apiError("PROFILE_QUERY_FAILED", profileResult.error.message, 500);
  }

  if (!profileResult.data) {
    return apiError("PROFILE_NOT_FOUND", "No existe perfil para ese correo.", 404);
  }

  const roleResult = await supabase
    .from("tenant_roles")
    .select("id,key,name")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("key", roleKey)
    .maybeSingle();

  if (roleResult.error) {
    return apiError("ROLE_QUERY_FAILED", roleResult.error.message, 500);
  }

  if (!roleResult.data) {
    return apiError("ROLE_NOT_FOUND", "No existe ese rol en el tenant actual.", 404);
  }

  let membershipId: string;

  const membershipLookup = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("user_id", profileResult.data.id)
    .maybeSingle();

  if (membershipLookup.error) {
    return apiError("MEMBERSHIP_QUERY_FAILED", membershipLookup.error.message, 500);
  }

  if (membershipLookup.data) {
    membershipId = membershipLookup.data.id;
    const updateMembership = await supabase
      .from("tenant_memberships")
      .update({ status })
      .eq("id", membershipId);

    if (updateMembership.error) {
      return apiError("MEMBERSHIP_UPDATE_FAILED", updateMembership.error.message, 400);
    }
  } else {
    const createMembership = await supabase
      .from("tenant_memberships")
      .insert({
        tenant_id: auth.context.user.tenantId,
        user_id: profileResult.data.id,
        status,
        invited_by_user_id: auth.context.user.id,
      })
      .select("id")
      .single();

    if (createMembership.error || !createMembership.data) {
      return apiError(
        "MEMBERSHIP_CREATE_FAILED",
        createMembership.error?.message ?? "No fue posible crear la membresia.",
        400
      );
    }

    membershipId = createMembership.data.id;
  }

  const clearRoles = await supabase
    .from("tenant_user_roles")
    .delete()
    .eq("membership_id", membershipId);

  if (clearRoles.error) {
    return apiError("MEMBERSHIP_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
  }

  const assignRole = await supabase.from("tenant_user_roles").insert({
    membership_id: membershipId,
    tenant_role_id: roleResult.data.id,
    assigned_by_user_id: auth.context.user.id,
  });

  if (assignRole.error) {
    return apiError("MEMBERSHIP_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "tenant.iam.memberships",
    resourceId: membershipId,
    payload: {
      email,
      roleKey,
      status,
    },
  });

  return apiSuccess(
    {
      membership: {
        id: membershipId,
        userId: profileResult.data.id,
        email: profileResult.data.email,
        status,
        roleKey: roleResult.data.key,
        roleName: roleResult.data.name,
      },
    },
    { status: 201 }
  );
}
