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
  uppIds?: string[];
  uppAccess?: Array<{
    uppId?: string;
    accessLevel?: "viewer" | "editor" | "owner";
  }>;
  accessLevel?: "viewer" | "editor" | "owner";
}

const EMPLOYEE_ROLE_KEY = "employee";
const EMPLOYEE_ROLE_NAME = "Empleado";

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

function normalizeUppAccessInput(body: EmployeeBody) {
  if (Array.isArray(body.uppAccess)) {
    const byUppId = new Map<string, { uppId: string; accessLevel: "viewer" | "editor" | "owner" }>();

    body.uppAccess.forEach((item) => {
      const uppId = item.uppId?.trim();
      const accessLevel = item.accessLevel ?? "viewer";

      if (!uppId) {
        return;
      }

      byUppId.set(uppId, {
        uppId,
        accessLevel,
      });
    });

    return [...byUppId.values()];
  }

  const fallbackAccessLevel = body.accessLevel ?? "viewer";
  return Array.from(new Set((body.uppIds ?? []).map((uppId) => uppId.trim()).filter(Boolean))).map(
    (uppId) => ({
      uppId,
      accessLevel: fallbackAccessLevel,
    })
  );
}

async function ensureEmployeeRole(tenantId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdminClient();
  const existingRole = await supabaseAdmin
    .from("tenant_roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("key", EMPLOYEE_ROLE_KEY)
    .maybeSingle();

  if (!existingRole.error && existingRole.data) {
    return existingRole.data.id;
  }

  const createRole = await supabaseAdmin
    .from("tenant_roles")
    .insert({
      tenant_id: tenantId,
      key: EMPLOYEE_ROLE_KEY,
      name: EMPLOYEE_ROLE_NAME,
      is_system: true,
      priority: 70,
    })
    .select("id")
    .single();

  if (createRole.error || !createRole.data) {
    throw new Error(createRole.error?.message ?? "EMPLOYEE_ROLE_CREATE_FAILED");
  }

  const permissionsResult = await supabaseAdmin
    .from("permissions")
    .select("id")
    .in("key", [
      "producer.dashboard.read",
      "producer.upp.read",
      "producer.bovinos.read",
      "producer.bovinos.write",
      "producer.movements.read",
      "producer.movements.write",
      "producer.exports.read",
      "producer.exports.write",
      "producer.documents.read",
      "producer.documents.write",
      "producer.employees.read",
    ]);

  if (!permissionsResult.error && (permissionsResult.data ?? []).length > 0) {
    const permissionInsert = await supabaseAdmin.from("tenant_role_permissions").insert(
      (permissionsResult.data ?? []).map((permission) => ({
        tenant_role_id: createRole.data.id,
        permission_id: permission.id,
      }))
    );

    if (permissionInsert.error) {
      throw new Error(permissionInsert.error.message);
    }
  }

  return createRole.data.id;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.employees.read", "producer.employees.write"],
    resource: "producer.employees",
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
    return apiError("EMPLOYEES_QUERY_FAILED", membershipsResult.error.message, 500);
  }

  const memberships = membershipsResult.data ?? [];
  if (memberships.length === 0) {
    const availableRolesPayload = await listTenantRolesForPanel(auth.context.user.tenantId, "producer");
    return apiSuccess({
      employees: [],
      availableRoles: availableRolesPayload.roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        isSystem: role.isSystem,
        memberCount: role.memberCount,
      })),
    });
  }

  const membershipIds = memberships.map((row) => row.id);
  const userIds = memberships.map((row) => row.user_id);

  const [profilesResult, rolesResult, accessResult, authLifecycleEntries] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,email,status,created_at").in("id", userIds),
    supabaseAdmin
      .from("tenant_user_roles")
      .select("membership_id,tenant_role_id,tenant_role:tenant_roles(id,key,name,is_system)")
      .in("membership_id", membershipIds),
    supabaseAdmin
      .from("user_upp_access")
      .select("user_id,upp_id,access_level,status")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("user_id", userIds),
    Promise.all(
      userIds.map(async (userId) => ({
        userId,
        snapshot: await fetchAuthUserLifecycleSnapshot(userId),
      }))
    ),
  ]);

  if (profilesResult.error || rolesResult.error || accessResult.error) {
    return apiError("EMPLOYEES_JOIN_QUERY_FAILED", "No fue posible resolver empleados.", 500, {
      profiles: profilesResult.error?.message,
      roles: rolesResult.error?.message,
      access: accessResult.error?.message,
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

  const accessByUserId = (accessResult.data ?? []).reduce((acc, row) => {
    const current = acc.get(row.user_id) ?? [];
    current.push({
      uppId: row.upp_id,
      accessLevel: row.access_level,
      status: row.status,
    });
    acc.set(row.user_id, current);
    return acc;
  }, new Map<string, Array<{ uppId: string; accessLevel: string; status: string }>>());

  const availableRolesPayload = await listTenantRolesForPanel(auth.context.user.tenantId, "producer");

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
          uppAccess: accessByUserId.get(membership.user_id) ?? [],
          joinedAt: membership.joined_at,
        };
      }),
    availableRoles: availableRolesPayload.roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
      memberCount: role.memberCount,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.employees.write"],
    resource: "producer.employees",
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

  const uppAccess = normalizeUppAccessInput(body);
  const uppIds = uppAccess.map((item) => item.uppId);

  const supabaseAdmin = getSupabaseAdminClient();
  let authUser: { userId: string; invitationSent: boolean };
  try {
    authUser = await ensureAuthUserForEmail({
      email,
      redirectTo: buildSetPasswordRedirectUrl(),
    });
  } catch (error) {
    return apiError(
      "EMPLOYEE_AUTH_RESOLVE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear o invitar al usuario.",
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
      return apiError("EMPLOYEE_MEMBERSHIP_UPDATE_FAILED", membershipUpdate.error.message, 400);
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
        "EMPLOYEE_MEMBERSHIP_CREATE_FAILED",
        membershipInsert.error?.message ?? "No fue posible crear membresia.",
        400
      );
    }

    membershipId = membershipInsert.data.id;
  }

  let employeeRoleId: string;
  try {
    const selectedRole = await resolveAssignableRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "producer",
      roleId: body.roleId?.trim(),
      fallbackRoleKey: EMPLOYEE_ROLE_KEY,
    });
    employeeRoleId = selectedRole.id;
  } catch (error) {
    try {
      employeeRoleId = await ensureEmployeeRole(auth.context.user.tenantId);
    } catch {
      await rollbackInvitedUser();
      return apiError(
        "EMPLOYEE_ROLE_RESOLVE_FAILED",
        error instanceof Error ? error.message : "No fue posible resolver el rol del empleado.",
        400
      );
    }
  }

  const clearRoles = await supabaseAdmin.from("tenant_user_roles").delete().eq("membership_id", membershipId);
  if (clearRoles.error) {
    await rollbackInvitedUser();
    return apiError("EMPLOYEE_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
  }

  const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
    membership_id: membershipId,
    tenant_role_id: employeeRoleId,
    assigned_by_user_id: auth.context.user.id,
  });

  if (assignRole.error) {
    await rollbackInvitedUser();
    return apiError("EMPLOYEE_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
  }

  if (Array.isArray(body.uppAccess) || Array.isArray(body.uppIds)) {
    if (uppIds.length > 0) {
      const uppsCheck = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", auth.context.user.tenantId)
        .in("id", uppIds);

      if (uppsCheck.error || (uppsCheck.data ?? []).length !== uppIds.length) {
        await rollbackInvitedUser();
        return apiError("INVALID_UPP_SCOPE", "Uno o mas uppIds no pertenecen al tenant.", 400);
      }
    }

    await supabaseAdmin
      .from("user_upp_access")
      .delete()
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", authUser.userId);

    const accessInsert = await supabaseAdmin.from("user_upp_access").insert(
      uppAccess.map((item) => ({
        tenant_id: auth.context.user.tenantId,
        user_id: authUser.userId,
        upp_id: item.uppId,
        access_level: item.accessLevel,
        status: "active",
        granted_by_user_id: auth.context.user.id,
      }))
    );

    if (accessInsert.error) {
      await rollbackInvitedUser();
      return apiError("EMPLOYEE_UPP_ACCESS_FAILED", accessInsert.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.employees",
    resourceId: membershipId,
    payload: {
      email,
      roleId: body.roleId?.trim() ?? employeeRoleId,
      uppAccess,
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
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.employees.write"],
    resource: "producer.employees",
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
    return apiError("EMPLOYEE_MEMBERSHIP_NOT_FOUND", "No existe membresia con ese id.", 404);
  }
  const membership = membershipResult.data;

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
  }

  if (Object.keys(updatePayload).length > 0) {
    const membershipUpdate = await supabaseAdmin
      .from("tenant_memberships")
      .update(updatePayload)
      .eq("id", membershipId);

    if (membershipUpdate.error) {
      return apiError("EMPLOYEE_MEMBERSHIP_UPDATE_FAILED", membershipUpdate.error.message, 400);
    }
  }

  if (body.roleId?.trim()) {
    let nextRoleId: string;
    try {
      const selectedRole = await resolveAssignableRoleForPanel({
        tenantId: auth.context.user.tenantId,
        panel: "producer",
        roleId: body.roleId.trim(),
      });
      nextRoleId = selectedRole.id;
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
      return apiError("EMPLOYEE_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
    }

    const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
      membership_id: membershipId,
      tenant_role_id: nextRoleId,
      assigned_by_user_id: auth.context.user.id,
    });

    if (assignRole.error) {
      return apiError("EMPLOYEE_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
    }
  }

  if (Array.isArray(body.uppAccess) || Array.isArray(body.uppIds)) {
    const uppAccess = normalizeUppAccessInput(body);
    const uppIds = uppAccess.map((item) => item.uppId);

    if (uppIds.length > 0) {
      const uppsCheck = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", auth.context.user.tenantId)
        .in("id", uppIds);

      if (uppsCheck.error || (uppsCheck.data ?? []).length !== uppIds.length) {
        return apiError("INVALID_UPP_SCOPE", "Uno o mas uppIds no pertenecen al tenant.", 400);
      }
    }

    await supabaseAdmin
      .from("user_upp_access")
      .delete()
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", membership.user_id);

    if (uppIds.length > 0) {
      const accessInsert = await supabaseAdmin.from("user_upp_access").insert(
        uppAccess.map((item) => ({
          tenant_id: auth.context.user.tenantId,
          user_id: membership.user_id,
          upp_id: item.uppId,
          access_level: item.accessLevel,
          status: "active",
          granted_by_user_id: auth.context.user.id,
        }))
      );

      if (accessInsert.error) {
        return apiError("EMPLOYEE_UPP_ACCESS_FAILED", accessInsert.error.message, 400);
      }
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.employees",
    resourceId: membershipId,
    payload: {
      status: body.status ?? null,
      roleId: body.roleId?.trim() ?? null,
      uppAccess: body.uppAccess ?? null,
    },
  });

  return apiSuccess({
    membershipId,
    userId: membership.user_id,
    status: body.status ?? membership.status,
  });
}
