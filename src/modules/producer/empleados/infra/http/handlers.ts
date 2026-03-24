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
  fullName?: string;
  licenseNumber?: string;
  status?: "active" | "inactive" | "suspended";
  uppIds?: string[];
  uppAccess?: Array<{
    uppId?: string;
    accessLevel?: "viewer" | "editor" | "owner";
  }>;
  accessLevel?: "viewer" | "editor" | "owner";
}

interface MvzProfileSnapshot {
  fullName: string;
  licenseNumber: string;
  status: string;
}

const EMPLOYEE_ROLE_KEY = "employee";
const MVZ_INTERNAL_ROLE_KEY = "mvz_internal";

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

function normalizeMvzProfileInput(body: EmployeeBody) {
  return {
    fullName: body.fullName?.trim() || null,
    licenseNumber: body.licenseNumber?.trim().toUpperCase() || null,
  };
}

async function listCurrentUppAccess(input: { tenantId: string; userId: string }) {
  const supabaseAdmin = getSupabaseAdminClient();
  const accessResult = await supabaseAdmin
    .from("user_upp_access")
    .select("upp_id,access_level,status")
    .eq("tenant_id", input.tenantId)
    .eq("user_id", input.userId);

  if (accessResult.error) {
    throw new Error(accessResult.error.message);
  }

  return (accessResult.data ?? [])
    .filter((row) => row.status === "active")
    .map((row) => ({
      uppId: row.upp_id,
      accessLevel: row.access_level as "viewer" | "editor" | "owner",
    }));
}

async function upsertInternalMvzProfile(input: {
  tenantId: string;
  userId: string;
  fullName: string | null;
  licenseNumber: string | null;
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const existingProfileResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("id,full_name,license_number,status")
    .eq("owner_tenant_id", input.tenantId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existingProfileResult.error) {
    throw new Error(existingProfileResult.error.message);
  }

  if (existingProfileResult.data) {
    const nextFullName = input.fullName ?? existingProfileResult.data.full_name;
    const nextLicenseNumber = input.licenseNumber ?? existingProfileResult.data.license_number;
    const updatePayload: Record<string, unknown> = {};

    if (existingProfileResult.data.full_name !== nextFullName) {
      updatePayload.full_name = nextFullName;
    }

    if (existingProfileResult.data.license_number !== nextLicenseNumber) {
      updatePayload.license_number = nextLicenseNumber;
    }

    if (existingProfileResult.data.status !== "active") {
      updatePayload.status = "active";
    }

    if (Object.keys(updatePayload).length > 0) {
      const updateResult = await supabaseAdmin.from("mvz_profiles").update(updatePayload).eq("id", existingProfileResult.data.id);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    return existingProfileResult.data.id;
  }

  if (!input.fullName || !input.licenseNumber) {
    throw new Error("Debe capturar nombre profesional y cédula/licencia para MVZ Interno.");
  }

  const insertResult = await supabaseAdmin
    .from("mvz_profiles")
    .insert({
      owner_tenant_id: input.tenantId,
      user_id: input.userId,
      full_name: input.fullName,
      license_number: input.licenseNumber,
      status: "active",
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    throw new Error(insertResult.error?.message ?? "No fue posible crear la ficha MVZ.");
  }

  return insertResult.data.id;
}

async function syncInternalMvzAssignments(input: {
  mvzProfileId: string | null;
  uppAccess: Array<{ uppId: string; accessLevel: "viewer" | "editor" | "owner" }>;
  assignedByUserId: string;
  enabled: boolean;
}) {
  if (!input.mvzProfileId) {
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const assignmentsResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .select("id,upp_id,status")
    .eq("mvz_profile_id", input.mvzProfileId);

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const desiredUppIds = new Set(input.enabled ? input.uppAccess.map((item) => item.uppId) : []);
  const currentAssignments = assignmentsResult.data ?? [];

  for (const assignment of currentAssignments) {
    if (desiredUppIds.has(assignment.upp_id)) {
      desiredUppIds.delete(assignment.upp_id);

      if (assignment.status !== "active") {
        const reactivateResult = await supabaseAdmin
          .from("mvz_upp_assignments")
          .update({
            status: "active",
            assigned_by_user_id: input.assignedByUserId,
            assigned_at: new Date().toISOString(),
            unassigned_at: null,
          })
          .eq("id", assignment.id);

        if (reactivateResult.error) {
          throw new Error(reactivateResult.error.message);
        }
      }

      continue;
    }

    if (assignment.status === "active") {
      const deactivateResult = await supabaseAdmin
        .from("mvz_upp_assignments")
        .update({
          status: "inactive",
          unassigned_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (deactivateResult.error) {
        throw new Error(deactivateResult.error.message);
      }
    }
  }

  for (const uppId of desiredUppIds) {
    const insertResult = await supabaseAdmin.from("mvz_upp_assignments").insert({
      mvz_profile_id: input.mvzProfileId,
      upp_id: uppId,
      status: "active",
      assigned_by_user_id: input.assignedByUserId,
      unassigned_at: null,
    });

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }
  }
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

  const [profilesResult, rolesResult, accessResult, mvzProfilesResult, authLifecycleEntries] = await Promise.all([
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
    supabaseAdmin
      .from("mvz_profiles")
      .select("user_id,full_name,license_number,status")
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .in("user_id", userIds),
    Promise.all(
      userIds.map(async (userId) => ({
        userId,
        snapshot: await fetchAuthUserLifecycleSnapshot(userId),
      }))
    ),
  ]);

  if (profilesResult.error || rolesResult.error || accessResult.error || mvzProfilesResult.error) {
    return apiError("EMPLOYEES_JOIN_QUERY_FAILED", "No fue posible resolver empleados.", 500, {
      profiles: profilesResult.error?.message,
      roles: rolesResult.error?.message,
      access: accessResult.error?.message,
      mvzProfiles: mvzProfilesResult.error?.message,
    });
  }

  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const mvzProfileByUserId = new Map<string, MvzProfileSnapshot>(
    (mvzProfilesResult.data ?? []).map((profile) => [
      profile.user_id,
      {
        fullName: profile.full_name,
        licenseNumber: profile.license_number,
        status: profile.status,
      },
    ])
  );
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
          mvzProfile: mvzProfileByUserId.get(membership.user_id) ?? null,
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

  const mvzProfileInput = normalizeMvzProfileInput(body);
  let selectedRole: Awaited<ReturnType<typeof resolveAssignableRoleForPanel>>;
  let employeeRoleId: string;
  try {
    selectedRole = await resolveAssignableRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "producer",
      roleId: body.roleId?.trim(),
      fallbackRoleKey: EMPLOYEE_ROLE_KEY,
    });
    employeeRoleId = selectedRole.id;
  } catch (error) {
    await rollbackInvitedUser();
    return apiError(
      "EMPLOYEE_ROLE_RESOLVE_FAILED",
      error instanceof Error ? error.message : "No fue posible resolver el rol de la persona invitada.",
      400
    );
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

    if (uppAccess.length > 0) {
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
  }

  let mvzProfileId: string | null = null;
  try {
    if (selectedRole.key === MVZ_INTERNAL_ROLE_KEY) {
      mvzProfileId = await upsertInternalMvzProfile({
        tenantId: auth.context.user.tenantId,
        userId: authUser.userId,
        fullName: mvzProfileInput.fullName,
        licenseNumber: mvzProfileInput.licenseNumber,
      });
    }

    await syncInternalMvzAssignments({
      mvzProfileId,
      uppAccess,
      assignedByUserId: auth.context.user.id,
      enabled: selectedRole.key === MVZ_INTERNAL_ROLE_KEY,
    });
  } catch (error) {
    await rollbackInvitedUser();
    return apiError(
      "EMPLOYEE_MVZ_PROFILE_SYNC_FAILED",
      error instanceof Error ? error.message : "No fue posible preparar el acceso MVZ interno.",
      400
    );
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
      roleKey: selectedRole.key,
      fullName: mvzProfileInput.fullName,
      licenseNumber: mvzProfileInput.licenseNumber,
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
  const currentRoleResult = await supabaseAdmin
    .from("tenant_user_roles")
    .select("tenant_role_id,tenant_role:tenant_roles(key)")
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (currentRoleResult.error) {
    return apiError("EMPLOYEE_ROLE_QUERY_FAILED", currentRoleResult.error.message, 400);
  }

  const currentRole = Array.isArray(currentRoleResult.data?.tenant_role)
    ? currentRoleResult.data?.tenant_role[0]
    : currentRoleResult.data?.tenant_role;

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

  let nextRoleId: string | null = currentRoleResult.data?.tenant_role_id ?? null;
  let nextRoleKey = currentRole?.key ?? null;
  if (body.roleId?.trim()) {
    try {
      const selectedRole = await resolveAssignableRoleForPanel({
        tenantId: auth.context.user.tenantId,
        panel: "producer",
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

  const uppAccess = Array.isArray(body.uppAccess) || Array.isArray(body.uppIds)
    ? normalizeUppAccessInput(body)
    : null;

  if (Array.isArray(body.uppAccess) || Array.isArray(body.uppIds)) {
    const uppIds = (uppAccess ?? []).map((item) => item.uppId);

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

    if (uppIds.length > 0 && uppAccess) {
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

  const mvzProfileInput = normalizeMvzProfileInput(body);
  const effectiveMembershipStatus = (body.status ?? membership.status) as "active" | "inactive" | "suspended";

  try {
    const effectiveUppAccess =
      uppAccess ?? (await listCurrentUppAccess({ tenantId: auth.context.user.tenantId, userId: membership.user_id }));
    let mvzProfileId: string | null = null;

    if (nextRoleKey === MVZ_INTERNAL_ROLE_KEY) {
      mvzProfileId = await upsertInternalMvzProfile({
        tenantId: auth.context.user.tenantId,
        userId: membership.user_id,
        fullName: mvzProfileInput.fullName,
        licenseNumber: mvzProfileInput.licenseNumber,
      });
    } else {
      const existingMvzProfileResult = await supabaseAdmin
        .from("mvz_profiles")
        .select("id")
        .eq("owner_tenant_id", auth.context.user.tenantId)
        .eq("user_id", membership.user_id)
        .maybeSingle();

      if (existingMvzProfileResult.error) {
        throw new Error(existingMvzProfileResult.error.message);
      }

      mvzProfileId = existingMvzProfileResult.data?.id ?? null;
    }

    await syncInternalMvzAssignments({
      mvzProfileId,
      uppAccess: effectiveUppAccess,
      assignedByUserId: auth.context.user.id,
      enabled: nextRoleKey === MVZ_INTERNAL_ROLE_KEY && effectiveMembershipStatus === "active",
    });
  } catch (error) {
    return apiError(
      "EMPLOYEE_MVZ_PROFILE_SYNC_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar el acceso MVZ interno.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.employees",
    resourceId: membershipId,
    payload: {
      status: body.status ?? null,
      roleId: body.roleId?.trim() ?? nextRoleId,
      roleKey: nextRoleKey,
      fullName: mvzProfileInput.fullName,
      licenseNumber: mvzProfileInput.licenseNumber,
      uppAccess: uppAccess ?? null,
    },
  });

  return apiSuccess({
    membershipId,
    userId: membership.user_id,
    status: body.status ?? membership.status,
  });
}
