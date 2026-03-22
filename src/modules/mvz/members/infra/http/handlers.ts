import { apiError, apiSuccess } from "@/shared/lib/api-response";
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  type AppRole,
} from "@/shared/lib/auth";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

const MVZ_MEMBER_ROLES = ["mvz_government", "mvz_internal"] as const;

type MvzMemberRoleKey = (typeof MVZ_MEMBER_ROLES)[number];

interface MvzMemberBody {
  membershipId?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
  roleKey?: MvzMemberRoleKey;
}

function isMvzMemberRoleKey(value: string | null | undefined): value is MvzMemberRoleKey {
  return MVZ_MEMBER_ROLES.includes(value as MvzMemberRoleKey);
}

function getMvzRolePriority(roleKey: MvzMemberRoleKey) {
  return roleKey === "mvz_government" ? 10 : 20;
}

async function ensureMvzRole(tenantId: string, roleKey: MvzMemberRoleKey): Promise<string> {
  const supabaseAdmin = getSupabaseAdminClient();
  const existingRole = await supabaseAdmin
    .from("tenant_roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("key", roleKey)
    .maybeSingle();

  let roleId = existingRole.data?.id ?? null;
  if (existingRole.error) {
    throw new Error(existingRole.error.message);
  }

  if (!roleId) {
    const createdRole = await supabaseAdmin
      .from("tenant_roles")
      .insert({
        tenant_id: tenantId,
        key: roleKey,
        name: ROLE_LABELS[roleKey],
        is_system: true,
        priority: getMvzRolePriority(roleKey),
      })
      .select("id")
      .single();

    if (createdRole.error || !createdRole.data) {
      throw new Error(createdRole.error?.message ?? "MVZ_ROLE_CREATE_FAILED");
    }

    roleId = createdRole.data.id;
  }

  const expectedPermissions = ROLE_DEFAULT_PERMISSIONS[roleKey as AppRole] ?? [];
  const [permissionCatalogResult, currentRolePermissionsResult] = await Promise.all([
    supabaseAdmin.from("permissions").select("id,key").in("key", expectedPermissions),
    supabaseAdmin
      .from("tenant_role_permissions")
      .select("permission_id")
      .eq("tenant_role_id", roleId),
  ]);

  if (permissionCatalogResult.error) {
    throw new Error(permissionCatalogResult.error.message);
  }

  if (currentRolePermissionsResult.error) {
    throw new Error(currentRolePermissionsResult.error.message);
  }

  const existingPermissionIds = new Set(
    (currentRolePermissionsResult.data ?? []).map((row) => row.permission_id)
  );
  const missingPermissions = (permissionCatalogResult.data ?? [])
    .filter((permission) => !existingPermissionIds.has(permission.id))
    .map((permission) => ({
      tenant_role_id: roleId,
      permission_id: permission.id,
    }));

  if (missingPermissions.length > 0) {
    const insertResult = await supabaseAdmin
      .from("tenant_role_permissions")
      .insert(missingPermissions);

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }
  }

  return roleId;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.members.read"],
    resource: "mvz.members",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const membershipsResult = await supabaseAdmin
    .from("tenant_memberships")
    .select("id,user_id,status,joined_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .order("joined_at", { ascending: false });

  if (membershipsResult.error) {
    return apiError("MVZ_MEMBERS_QUERY_FAILED", membershipsResult.error.message, 500);
  }

  const memberships = (membershipsResult.data ?? []).filter(
    (membership) => membership.user_id !== auth.context.user.id
  );
  if (memberships.length === 0) {
    return apiSuccess({ members: [] });
  }

  const membershipIds = memberships.map((membership) => membership.id);
  const userIds = memberships.map((membership) => membership.user_id);

  const [profilesResult, rolesResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,email").in("id", userIds),
    supabaseAdmin
      .from("tenant_user_roles")
      .select("membership_id,tenant_role:tenant_roles(key,name)")
      .in("membership_id", membershipIds),
  ]);

  if (profilesResult.error || rolesResult.error) {
    return apiError("MVZ_MEMBERS_JOIN_FAILED", "No fue posible resolver el equipo MVZ.", 500, {
      profiles: profilesResult.error?.message,
      roles: rolesResult.error?.message,
    });
  }

  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const roleByMembership = new Map<string, { key: string | null; name: string | null }>();

  (rolesResult.data ?? []).forEach((row) => {
    if (roleByMembership.has(row.membership_id)) {
      return;
    }

    const role = Array.isArray(row.tenant_role) ? row.tenant_role[0] : row.tenant_role;
    roleByMembership.set(row.membership_id, {
      key: role?.key ?? null,
      name: role?.name ?? null,
    });
  });

  return apiSuccess({
    members: memberships.map((membership) => {
      const roleInfo = roleByMembership.get(membership.id) ?? { key: null, name: null };
      const profile = profileByUserId.get(membership.user_id);
      return {
        id: membership.id,
        userId: membership.user_id,
        email: profile?.email ?? "",
        membershipStatus: membership.status,
        roleKey: roleInfo.key,
        roleName: roleInfo.name,
        joinedAt: membership.joined_at,
      };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.members.write"],
    resource: "mvz.members",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzMemberBody;
  try {
    body = (await request.json()) as MvzMemberBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const roleKey = isMvzMemberRoleKey(body.roleKey ?? null) ? body.roleKey! : "mvz_internal";

  if (!email) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email del miembro MVZ.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return apiError("MVZ_MEMBER_PROFILE_NOT_FOUND", "No existe usuario con ese correo.", 404);
  }

  if (profileResult.data.id === auth.context.user.id) {
    return apiError("INVALID_MEMBER", "No puede reasignarse a si mismo desde este flujo.", 400);
  }

  let membershipId: string;
  const membershipLookup = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("user_id", profileResult.data.id)
    .maybeSingle();

  if (membershipLookup.error) {
    return apiError("MVZ_MEMBER_LOOKUP_FAILED", membershipLookup.error.message, 400);
  }

  if (membershipLookup.data) {
    membershipId = membershipLookup.data.id;
    const membershipUpdate = await supabaseAdmin
      .from("tenant_memberships")
      .update({ status: "active" })
      .eq("id", membershipId);

    if (membershipUpdate.error) {
      return apiError("MVZ_MEMBER_MEMBERSHIP_UPDATE_FAILED", membershipUpdate.error.message, 400);
    }
  } else {
    const membershipInsert = await supabaseAdmin
      .from("tenant_memberships")
      .insert({
        tenant_id: auth.context.user.tenantId,
        user_id: profileResult.data.id,
        status: "active",
        invited_by_user_id: auth.context.user.id,
      })
      .select("id")
      .single();

    if (membershipInsert.error || !membershipInsert.data) {
      return apiError(
        "MVZ_MEMBER_MEMBERSHIP_CREATE_FAILED",
        membershipInsert.error?.message ?? "No fue posible crear la membresia.",
        400
      );
    }

    membershipId = membershipInsert.data.id;
  }

  let roleId: string;
  try {
    roleId = await ensureMvzRole(auth.context.user.tenantId, roleKey);
  } catch (error) {
    return apiError(
      "MVZ_MEMBER_ROLE_RESOLVE_FAILED",
      error instanceof Error ? error.message : "No fue posible resolver el rol MVZ.",
      400
    );
  }

  const clearRoles = await supabaseAdmin
    .from("tenant_user_roles")
    .delete()
    .eq("membership_id", membershipId);

  if (clearRoles.error) {
    return apiError("MVZ_MEMBER_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
  }

  const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
    membership_id: membershipId,
    tenant_role_id: roleId,
    assigned_by_user_id: auth.context.user.id,
  });

  if (assignRole.error) {
    return apiError("MVZ_MEMBER_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "mvz.members",
    resourceId: membershipId,
    payload: {
      email,
      roleKey,
    },
  });

  return apiSuccess(
    {
      membershipId,
      userId: profileResult.data.id,
      email: profileResult.data.email,
      roleKey,
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.members.write"],
    resource: "mvz.members",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzMemberBody;
  try {
    body = (await request.json()) as MvzMemberBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const membershipId = body.membershipId?.trim();
  if (!membershipId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar membershipId.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const membershipResult = await supabaseAdmin
    .from("tenant_memberships")
    .select("id,user_id,status")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return apiError("MVZ_MEMBER_NOT_FOUND", "No existe membresia con ese id.", 404);
  }

  if (membershipResult.data.user_id === auth.context.user.id) {
    return apiError("INVALID_MEMBER", "No puede modificarse a si mismo desde este flujo.", 400);
  }

  if (body.status) {
    const membershipUpdate = await supabaseAdmin
      .from("tenant_memberships")
      .update({ status: body.status })
      .eq("id", membershipId);

    if (membershipUpdate.error) {
      return apiError("MVZ_MEMBER_STATUS_UPDATE_FAILED", membershipUpdate.error.message, 400);
    }
  }

  if (body.roleKey) {
    if (!isMvzMemberRoleKey(body.roleKey)) {
      return apiError("INVALID_ROLE", "roleKey no es valido para equipo MVZ.", 400);
    }

    let roleId: string;
    try {
      roleId = await ensureMvzRole(auth.context.user.tenantId, body.roleKey);
    } catch (error) {
      return apiError(
        "MVZ_MEMBER_ROLE_RESOLVE_FAILED",
        error instanceof Error ? error.message : "No fue posible resolver el rol MVZ.",
        400
      );
    }

    const clearRoles = await supabaseAdmin
      .from("tenant_user_roles")
      .delete()
      .eq("membership_id", membershipId);

    if (clearRoles.error) {
      return apiError("MVZ_MEMBER_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
    }

    const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
      membership_id: membershipId,
      tenant_role_id: roleId,
      assigned_by_user_id: auth.context.user.id,
    });

    if (assignRole.error) {
      return apiError("MVZ_MEMBER_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "mvz.members",
    resourceId: membershipId,
    payload: {
      status: body.status ?? null,
      roleKey: body.roleKey ?? null,
    },
  });

  return apiSuccess({
    membershipId,
    status: body.status ?? membershipResult.data.status,
    roleKey: body.roleKey ?? null,
  });
}
