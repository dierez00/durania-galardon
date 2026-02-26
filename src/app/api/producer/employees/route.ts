import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface EmployeeBody {
  membershipId?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
  uppIds?: string[];
  accessLevel?: "viewer" | "editor" | "manager";
}

const EMPLOYEE_ROLE_KEY = "employee";
const EMPLOYEE_ROLE_NAME = "Empleado";

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
    roles: ["producer", "employee"],
    permissions: ["producer.employees.read"],
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
    return apiSuccess({ employees: [] });
  }

  const membershipIds = memberships.map((row) => row.id);
  const userIds = memberships.map((row) => row.user_id);

  const [profilesResult, rolesResult, accessResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,email,status,created_at").in("id", userIds),
    supabaseAdmin
      .from("tenant_user_roles")
      .select("membership_id,tenant_role:tenant_roles(key,name)")
      .in("membership_id", membershipIds),
    supabaseAdmin
      .from("user_upp_access")
      .select("user_id,upp_id,access_level,status")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("user_id", userIds),
  ]);

  if (profilesResult.error || rolesResult.error || accessResult.error) {
    return apiError("EMPLOYEES_JOIN_QUERY_FAILED", "No fue posible resolver empleados.", 500, {
      profiles: profilesResult.error?.message,
      roles: rolesResult.error?.message,
      access: accessResult.error?.message,
    });
  }

  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const roleByMembership = new Map<
    string,
    {
      key: string | null;
      name: string | null;
    }
  >();

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

  return apiSuccess({
    employees: memberships
      .filter((membership) => membership.user_id !== auth.context.user.id)
      .map((membership) => {
        const profile = profileByUserId.get(membership.user_id);
        const roleInfo = roleByMembership.get(membership.id) ?? { key: null, name: null };
        return {
          id: membership.id,
          userId: membership.user_id,
          email: profile?.email ?? "",
          profileStatus: profile?.status ?? "unknown",
          membershipStatus: membership.status,
          roleKey: roleInfo.key,
          roleName: roleInfo.name,
          uppAccess: accessByUserId.get(membership.user_id) ?? [],
          joinedAt: membership.joined_at,
        };
      }),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
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

  const uppIds = Array.from(new Set((body.uppIds ?? []).map((uppId) => uppId.trim()).filter(Boolean)));
  const accessLevel = body.accessLevel ?? "viewer";

  const supabaseAdmin = getSupabaseAdminClient();
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return apiError("EMPLOYEE_PROFILE_NOT_FOUND", "No existe usuario con ese correo.", 404);
  }
  const profile = profileResult.data;

  let membershipId: string;
  const membershipLookup = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("user_id", profile.id)
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
        user_id: profile.id,
        status: "active",
        invited_by_user_id: auth.context.user.id,
      })
      .select("id")
      .single();

    if (membershipInsert.error || !membershipInsert.data) {
      return apiError(
        "EMPLOYEE_MEMBERSHIP_CREATE_FAILED",
        membershipInsert.error?.message ?? "No fue posible crear membresia.",
        400
      );
    }

    membershipId = membershipInsert.data.id;
  }

  const employeeRoleId = await ensureEmployeeRole(auth.context.user.tenantId);

  const clearRoles = await supabaseAdmin.from("tenant_user_roles").delete().eq("membership_id", membershipId);
  if (clearRoles.error) {
    return apiError("EMPLOYEE_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
  }

  const assignRole = await supabaseAdmin.from("tenant_user_roles").insert({
    membership_id: membershipId,
    tenant_role_id: employeeRoleId,
    assigned_by_user_id: auth.context.user.id,
  });

  if (assignRole.error) {
    return apiError("EMPLOYEE_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
  }

  if (uppIds.length > 0) {
    const uppsCheck = await supabaseAdmin
      .from("upps")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("id", uppIds);

    if (uppsCheck.error || (uppsCheck.data ?? []).length !== uppIds.length) {
      return apiError("INVALID_UPP_SCOPE", "Uno o mas uppIds no pertenecen al tenant.", 400);
    }

    await supabaseAdmin
      .from("user_upp_access")
      .delete()
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", profile.id);

    const accessInsert = await supabaseAdmin.from("user_upp_access").insert(
      uppIds.map((uppId) => ({
        tenant_id: auth.context.user.tenantId,
        user_id: profile.id,
        upp_id: uppId,
        access_level: accessLevel,
        status: "active",
        granted_by_user_id: auth.context.user.id,
      }))
    );

    if (accessInsert.error) {
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
      uppIds,
      accessLevel,
    },
  });

  return apiSuccess(
    {
      membershipId,
      userId: profile.id,
      email: profile.email,
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
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

  if (Array.isArray(body.uppIds)) {
    const uppIds = Array.from(new Set(body.uppIds.map((uppId) => uppId.trim()).filter(Boolean)));
    const accessLevel = body.accessLevel ?? "viewer";

    const uppsCheck = await supabaseAdmin
      .from("upps")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("id", uppIds);

    if (uppsCheck.error || (uppsCheck.data ?? []).length !== uppIds.length) {
      return apiError("INVALID_UPP_SCOPE", "Uno o mas uppIds no pertenecen al tenant.", 400);
    }

    await supabaseAdmin
      .from("user_upp_access")
      .delete()
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", membership.user_id);

    if (uppIds.length > 0) {
      const accessInsert = await supabaseAdmin.from("user_upp_access").insert(
        uppIds.map((uppId) => ({
          tenant_id: auth.context.user.tenantId,
          user_id: membership.user_id,
          upp_id: uppId,
          access_level: accessLevel,
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
      uppIds: body.uppIds ?? null,
      accessLevel: body.accessLevel ?? null,
    },
  });

  return apiSuccess({
    membershipId,
    userId: membership.user_id,
    status: body.status ?? membership.status,
  });
}
