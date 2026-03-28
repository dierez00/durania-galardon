import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import {
  listTenantRolesForPanel,
  resolveAssignableRoleForPanel,
} from "@/server/authz/tenantRoles";
import { ensureAuthUserForEmail } from "@/server/admin/provisioning";
import { logAuditEvent } from "@/server/audit";
import { deleteAuthUser, fetchAuthUserLifecycleSnapshot } from "@/server/auth/provisioning";
import { buildSetPasswordRedirectUrl } from "@/modules/auth/shared/redirects";

interface EmployeeBody {
  membershipId?: string;
  roleId?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
}

type EmployeeAccessLifecycleStatus =
  | "invitation_sent"
  | "pending"
  | "active"
  | "offboarded";

function resolveEmployeeAccessLifecycleStatus(input: {
  membershipStatus: string;
  profileStatus: string | null | undefined;
  authLifecycle: {
    invitedAt: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
  } | null;
}): EmployeeAccessLifecycleStatus {
  if (input.membershipStatus === "inactive" || input.membershipStatus === "suspended") {
    return "offboarded";
  }

  if (input.profileStatus === "blocked") {
    return "offboarded";
  }

  if (input.authLifecycle?.invitedAt && !input.authLifecycle.emailConfirmedAt) {
    return "invitation_sent";
  }

  if (input.authLifecycle?.emailConfirmedAt && !input.authLifecycle.lastSignInAt) {
    return "pending";
  }

  return "active";
}

function toAvailableRolePayload(
  roles: Awaited<ReturnType<typeof listTenantRolesForPanel>>["roles"]
) {
  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    isSystem: role.isSystem,
    memberCount: role.memberCount,
  }));
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.employees.read", "admin.employees.write"],
    resource: "admin.employees",
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
    return apiError("ADMIN_EMPLOYEES_QUERY_FAILED", membershipsResult.error.message, 500);
  }

  const availableRolesPayload = await listTenantRolesForPanel(auth.context.user.tenantId, "admin");
  const memberships = membershipsResult.data ?? [];

  if (memberships.length === 0) {
    return apiSuccess({
      employees: [],
      availableRoles: toAvailableRolePayload(availableRolesPayload.roles),
    });
  }

  const membershipIds = memberships.map((row) => row.id);
  const userIds = memberships.map((row) => row.user_id);

  const [profilesResult, rolesResult, authLifecycleEntries] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,email,status").in("id", userIds),
    supabaseAdmin
      .from("tenant_user_roles")
      .select("membership_id,tenant_role_id,tenant_role:tenant_roles(id,key,name,is_system)")
      .in("membership_id", membershipIds),
    Promise.all(
      userIds.map(async (userId) => ({
        userId,
        snapshot: await fetchAuthUserLifecycleSnapshot(userId),
      }))
    ),
  ]);

  if (profilesResult.error || rolesResult.error) {
    return apiError("ADMIN_EMPLOYEES_JOIN_QUERY_FAILED", "No fue posible resolver empleados.", 500, {
      profiles: profilesResult.error?.message,
      roles: rolesResult.error?.message,
    });
  }

  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const authLifecycleByUserId = new Map(authLifecycleEntries.map((entry) => [entry.userId, entry.snapshot]));
  const roleByMembership = new Map<
    string,
    { id: string | null; key: string | null; name: string | null; isSystem: boolean }
  >();

  (rolesResult.data ?? []).forEach((row) => {
    if (roleByMembership.has(row.membership_id)) {
      return;
    }

    const role = Array.isArray(row.tenant_role) ? row.tenant_role[0] : row.tenant_role;
    roleByMembership.set(row.membership_id, {
      id: role?.id ?? row.tenant_role_id ?? null,
      key: role?.key ?? null,
      name: role?.name ?? null,
      isSystem: role?.is_system === true,
    });
  });

  return apiSuccess({
    employees: memberships
      .filter((membership) => membership.user_id !== auth.context.user.id)
      .map((membership) => {
        const profile = profileByUserId.get(membership.user_id);
        const roleInfo = roleByMembership.get(membership.id) ?? {
          id: null,
          key: null,
          name: null,
          isSystem: false,
        };

        return {
          id: membership.id,
          userId: membership.user_id,
          email: profile?.email ?? "",
          profileStatus: profile?.status ?? "unknown",
          membershipStatus: membership.status,
          accessLifecycleStatus: resolveEmployeeAccessLifecycleStatus({
            membershipStatus: membership.status,
            profileStatus: profile?.status,
            authLifecycle: authLifecycleByUserId.get(membership.user_id) ?? null,
          }),
          roleId: roleInfo.id,
          roleKey: roleInfo.key,
          roleName: roleInfo.name,
          isSystemRole: roleInfo.isSystem,
          joinedAt: membership.joined_at,
        };
      }),
    availableRoles: toAvailableRolePayload(availableRolesPayload.roles),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.employees.write"],
    resource: "admin.employees",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: EmployeeBody;
  try {
    body = (await request.json()) as EmployeeBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email del empleado.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  let authUser: { userId: string; invitationSent: boolean };
  try {
    authUser = await ensureAuthUserForEmail({
      email,
      redirectTo: buildSetPasswordRedirectUrl(),
    });
  } catch (error) {
    return apiError(
      "ADMIN_EMPLOYEE_AUTH_RESOLVE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear o invitar al usuario.",
      400
    );
  }

  if (authUser.userId === auth.context.user.id) {
    return apiError(
      "SELF_MANAGEMENT_NOT_ALLOWED",
      "No puedes darte de alta o reasignarte desde esta vista.",
      400
    );
  }

  const rollbackInvitedUser = async () => {
    if (authUser.invitationSent) {
      await deleteAuthUser(authUser.userId);
    }
  };

  let membershipId: string;
  const membershipLookup = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("user_id", authUser.userId)
    .maybeSingle();

  if (!membershipLookup.error && membershipLookup.data) {
    membershipId = membershipLookup.data.id;
    const membershipUpdate = await supabaseAdmin
      .from("tenant_memberships")
      .update({ status: "active" })
      .eq("id", membershipId);

    if (membershipUpdate.error) {
      return apiError("ADMIN_EMPLOYEE_MEMBERSHIP_UPDATE_FAILED", membershipUpdate.error.message, 400);
    }
  } else {
    const membershipInsert = await supabaseAdmin
      .from("tenant_memberships")
      .insert({
        tenant_id: auth.context.user.tenantId,
        user_id: authUser.userId,
        status: "active",
        invited_by_user_id: auth.context.user.id,
      })
      .select("id")
      .single();

    if (membershipInsert.error || !membershipInsert.data) {
      await rollbackInvitedUser();
      return apiError(
        "ADMIN_EMPLOYEE_MEMBERSHIP_CREATE_FAILED",
        membershipInsert.error?.message ?? "No fue posible crear la membresia.",
        400
      );
    }

    membershipId = membershipInsert.data.id;
  }

  let selectedRole: Awaited<ReturnType<typeof resolveAssignableRoleForPanel>>;
  try {
    selectedRole = await resolveAssignableRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "admin",
      roleId: body.roleId?.trim(),
    });
  } catch (error) {
    await rollbackInvitedUser();
    return apiError(
      "ADMIN_EMPLOYEE_ROLE_RESOLVE_FAILED",
      error instanceof Error ? error.message : "No fue posible resolver el rol de la persona invitada.",
      400
    );
  }

  const clearRoles = await supabaseAdmin
    .from("tenant_user_roles")
    .delete()
    .eq("membership_id", membershipId);
  if (clearRoles.error) {
    await rollbackInvitedUser();
    return apiError("ADMIN_EMPLOYEE_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
  }

  const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
    membership_id: membershipId,
    tenant_role_id: selectedRole.id,
    assigned_by_user_id: auth.context.user.id,
  });

  if (assignRole.error) {
    await rollbackInvitedUser();
    return apiError("ADMIN_EMPLOYEE_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.employees",
    resourceId: membershipId,
    payload: {
      email,
      roleId: selectedRole.id,
      roleKey: selectedRole.key,
      invitationSent: authUser.invitationSent,
    },
  });

  return apiSuccess(
    {
      membershipId,
      userId: authUser.userId,
      email,
      invitationSent: authUser.invitationSent,
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.employees.write"],
    resource: "admin.employees",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: EmployeeBody;
  try {
    body = (await request.json()) as EmployeeBody;
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
    return apiError("ADMIN_EMPLOYEE_MEMBERSHIP_NOT_FOUND", "No existe membresia con ese id.", 404);
  }

  if (
    membershipResult.data.user_id === auth.context.user.id &&
    ((body.status && body.status !== "active") || body.roleId?.trim())
  ) {
    return apiError(
      "SELF_MANAGEMENT_NOT_ALLOWED",
      "No puedes modificar tu propio acceso desde esta vista.",
      400
    );
  }

  const currentRoleResult = await supabaseAdmin
    .from("tenant_user_roles")
    .select("tenant_role_id,tenant_role:tenant_roles(key)")
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (currentRoleResult.error) {
    return apiError("ADMIN_EMPLOYEE_ROLE_QUERY_FAILED", currentRoleResult.error.message, 400);
  }

  const currentRole = Array.isArray(currentRoleResult.data?.tenant_role)
    ? currentRoleResult.data?.tenant_role[0]
    : currentRoleResult.data?.tenant_role;

  if (body.status) {
    const membershipUpdate = await supabaseAdmin
      .from("tenant_memberships")
      .update({ status: body.status })
      .eq("id", membershipId);

    if (membershipUpdate.error) {
      return apiError("ADMIN_EMPLOYEE_MEMBERSHIP_UPDATE_FAILED", membershipUpdate.error.message, 400);
    }
  }

  let nextRoleId: string | null = currentRoleResult.data?.tenant_role_id ?? null;
  let nextRoleKey = currentRole?.key ?? null;
  if (body.roleId?.trim()) {
    try {
      const selectedRole = await resolveAssignableRoleForPanel({
        tenantId: auth.context.user.tenantId,
        panel: "admin",
        roleId: body.roleId.trim(),
      });

      nextRoleId = selectedRole.id;
      nextRoleKey = selectedRole.key;
    } catch (error) {
      return apiError(
        "INVALID_ROLE_SCOPE",
        error instanceof Error ? error.message : "No fue posible asignar el rol solicitado.",
        400
      );
    }

    const clearRoles = await supabaseAdmin
      .from("tenant_user_roles")
      .delete()
      .eq("membership_id", membershipId);

    if (clearRoles.error) {
      return apiError("ADMIN_EMPLOYEE_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
    }

    const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
      membership_id: membershipId,
      tenant_role_id: nextRoleId,
      assigned_by_user_id: auth.context.user.id,
    });

    if (assignRole.error) {
      return apiError("ADMIN_EMPLOYEE_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.employees",
    resourceId: membershipId,
    payload: {
      status: body.status ?? null,
      roleId: body.roleId?.trim() ?? nextRoleId,
      roleKey: nextRoleKey,
    },
  });

  return apiSuccess({
    membershipId,
    userId: membershipResult.data.user_id,
    status: body.status ?? membershipResult.data.status,
  });
}
