import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import {
  ROLE_LABELS,
  isAppRole,
  isMvzViewRole,
  type AppRole,
} from "@/shared/lib/auth";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface CreateAdminUserBody {
  email?: string;
  password?: string;
  role?: AppRole;
  fullName?: string;
  licenseNumber?: string;
}

interface UpdateAdminUserBody {
  id?: string;
  fullName?: string;
  role?: AppRole;
  licenseNumber?: string;
}

interface DeleteAdminUserBody {
  id?: string;
  hardDelete?: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProfile(userId: string) {
  const supabase = getSupabaseProvisioningClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    await sleep(200);
  }

  return null;
}

type UserListItem = {
  id: string;
  email: string;
  status: "active" | "inactive" | "blocked";
  membershipStatus: "active" | "inactive" | "suspended";
  role: AppRole | null;
  roleLabel: string;
  fullName: string;
  licenseNumber: string | null;
  createdAt: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  status: "active" | "inactive" | "suspended";
};

type ProfileRow = {
  id: string;
  email: string;
  status: "active" | "inactive" | "blocked";
  created_at: string;
};

type TenantRoleRow = {
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

type ProducerRow = {
  user_id: string;
  full_name: string;
};

type MvzRow = {
  user_id: string;
  full_name: string;
  license_number: string;
};

function extractTenantRole(row: TenantRoleRow): { key: AppRole | null; name: string | null } {
  if (!row.tenant_role) {
    return { key: null, name: null };
  }

  const value = Array.isArray(row.tenant_role) ? row.tenant_role[0] : row.tenant_role;
  if (!value) {
    return { key: null, name: null };
  }

  if (!isAppRole(value.key)) {
    return { key: null, name: value.name ?? null };
  }

  return { key: value.key, name: value.name ?? null };
}

async function fetchUsers(tenantId: string): Promise<UserListItem[]> {
  const supabase = getSupabaseProvisioningClient();

  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id,user_id,status")
    .eq("owner_tenant_id", tenantId)
    .order("joined_at", { ascending: false });

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  const memberships = (membershipResult.data ?? []) as MembershipRow[];
  if (memberships.length === 0) {
    return [];
  }

  const membershipIds = memberships.map((row) => row.id);
  const userIds = memberships.map((row) => row.user_id);

  const [profilesResult, rolesResult, producersResult, mvzResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,status,created_at")
      .in("id", userIds),
    supabase
      .from("tenant_user_roles")
      .select("membership_id,tenant_role:tenant_roles(key,name)")
      .in("membership_id", membershipIds),
    supabase
      .from("producers")
      .select("user_id,full_name")
      .eq("owner_tenant_id", tenantId)
      .in("user_id", userIds),
    supabase
      .from("mvz_profiles")
      .select("user_id,full_name,license_number")
      .eq("owner_tenant_id", tenantId)
      .in("user_id", userIds),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  if (producersResult.error) {
    throw new Error(producersResult.error.message);
  }

  if (mvzResult.error) {
    throw new Error(mvzResult.error.message);
  }

  const profileById = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );
  const producerByUserId = new Map(
    ((producersResult.data ?? []) as ProducerRow[]).map((producer) => [producer.user_id, producer])
  );
  const mvzByUserId = new Map(((mvzResult.data ?? []) as MvzRow[]).map((mvz) => [mvz.user_id, mvz]));

  const roleByMembershipId = new Map<string, { key: AppRole | null; name: string | null }>();
  ((rolesResult.data ?? []) as TenantRoleRow[]).forEach((row) => {
    if (!roleByMembershipId.has(row.membership_id)) {
      roleByMembershipId.set(row.membership_id, extractTenantRole(row));
    }
  });

  return memberships
    .map((membership) => {
      const profile = profileById.get(membership.user_id);
      if (!profile) {
        return null;
      }

      const producer = producerByUserId.get(membership.user_id);
      const mvzProfile = mvzByUserId.get(membership.user_id);
      const roleInfo = roleByMembershipId.get(membership.id) ?? { key: null, name: null };

      return {
        id: profile.id,
        email: profile.email,
        status: profile.status,
        membershipStatus: membership.status,
        role: roleInfo.key,
        roleLabel:
          roleInfo.key
            ? ROLE_LABELS[roleInfo.key]
            : roleInfo.name ?? "Sin rol",
        fullName:
          mvzProfile?.full_name ??
          producer?.full_name ??
          profile.email.split("@")[0] ??
          "Usuario",
        licenseNumber: mvzProfile?.license_number ?? null,
        createdAt: profile.created_at,
      };
    })
    .filter((item): item is UserListItem => Boolean(item));
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.read"],
    resource: "admin.users",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const users = await fetchUsers(auth.context.user.tenantId);
    return apiSuccess({ users });
  } catch (error) {
    return apiError(
      "USERS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar usuarios.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.create", "admin.users.roles"],
    requireAllPermissions: true,
    resource: "admin.users",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: CreateAdminUserBody;
  try {
    body = (await request.json()) as CreateAdminUserBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim();
  const role = body.role;
  const licenseNumber = body.licenseNumber?.trim();

  if (!email || !password || !fullName || !role || !isAppRole(role)) {
    return apiError(
      "INVALID_PAYLOAD",
      "Debe enviar email, password, fullName y role valido (tenant_admin, producer, employee, mvz_government, mvz_internal)."
    );
  }

  if (isMvzViewRole(role) && !licenseNumber) {
    return apiError("INVALID_PAYLOAD", "licenseNumber es requerido para roles MVZ.");
  }

  const supabase = getSupabaseProvisioningClient();

  const tenantRoleResult = await supabase
    .from("tenant_roles")
    .select("id,key")
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .eq("key", role)
    .maybeSingle();

  if (tenantRoleResult.error) {
    return apiError("ROLE_QUERY_FAILED", tenantRoleResult.error.message, 500);
  }

  if (!tenantRoleResult.data) {
    return apiError("ROLE_NOT_FOUND", `No existe rol tenant configurado para key: ${role}.`, 500);
  }

  const createResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createResult.error || !createResult.data.user) {
    return apiError(
      "USER_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear el usuario en Supabase Auth.",
      400
    );
  }

  const createdUserId = createResult.data.user.id;

  try {
    const profile = await waitForProfile(createdUserId);
    if (!profile) {
      throw new Error("PROFILE_NOT_CREATED");
    }

    let membershipId: string;
    const membershipLookup = await supabase
      .from("tenant_memberships")
      .select("id")
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .eq("user_id", createdUserId)
      .maybeSingle();

    if (membershipLookup.error) {
      throw new Error(membershipLookup.error.message);
    }

    if (!membershipLookup.data) {
      const membershipInsert = await supabase
        .from("tenant_memberships")
        .insert({
          owner_tenant_id: auth.context.user.tenantId,
          user_id: createdUserId,
          status: "active",
          invited_by_user_id: auth.context.user.id,
        })
        .select("id")
        .single();

      if (membershipInsert.error || !membershipInsert.data) {
        throw new Error(membershipInsert.error?.message ?? "MEMBERSHIP_CREATE_FAILED");
      }

      membershipId = membershipInsert.data.id;
    } else {
      membershipId = membershipLookup.data.id;
      const membershipUpdate = await supabase
        .from("tenant_memberships")
        .update({ status: "active" })
        .eq("id", membershipId);

      if (membershipUpdate.error) {
        throw new Error(membershipUpdate.error.message);
      }
    }

    const clearOldRoles = await supabase
      .from("tenant_user_roles")
      .delete()
      .eq("membership_id", membershipId);
    if (clearOldRoles.error) {
      throw new Error(clearOldRoles.error.message);
    }

    const roleAssignResult = await supabase.from("tenant_user_roles").insert({
      membership_id: membershipId,
      tenant_role_id: tenantRoleResult.data.id,
      assigned_by_user_id: auth.context.user.id,
    });
    if (roleAssignResult.error) {
      throw new Error(roleAssignResult.error.message);
    }

    if (role === "producer") {
      const producerResult = await supabase.from("producers").insert({
        owner_tenant_id: auth.context.user.tenantId,
        user_id: createdUserId,
        full_name: fullName,
      });
      if (producerResult.error) {
        throw new Error(producerResult.error.message);
      }
    }

    if (isMvzViewRole(role)) {
      const mvzResult = await supabase.from("mvz_profiles").insert({
        owner_tenant_id: auth.context.user.tenantId,
        user_id: createdUserId,
        full_name: fullName,
        license_number: licenseNumber!,
      });
      if (mvzResult.error) {
        throw new Error(mvzResult.error.message);
      }
    }

    const users = await fetchUsers(auth.context.user.tenantId);
    const createdUser = users.find((user) => user.id === createdUserId);
    if (!createdUser) {
      throw new Error("USER_READ_FAILED");
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.users",
      resourceId: createdUserId,
      payload: { email, role },
    });

    return apiSuccess(
      {
        user: createdUser,
      },
      { status: 201 }
    );
  } catch (error) {
    await supabase.auth.admin.deleteUser(createdUserId);

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "fraud_attempt",
      resource: "admin.users",
      resourceId: createdUserId,
      payload: {
        reason: "USER_PROVISION_FAILED",
        message,
      },
    });
    return apiError(
      "USER_PROVISION_FAILED",
      `No fue posible completar la asignacion de rol/perfil. (${message})`,
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.update", "admin.users.roles"],
    resource: "admin.users",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UpdateAdminUserBody;
  try {
    body = (await request.json()) as UpdateAdminUserBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const userId = body.id?.trim();
  const fullName = body.fullName?.trim();
  const nextRole = body.role;
  const licenseNumber = body.licenseNumber?.trim();

  if (!userId || (!fullName && !nextRole)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id y al menos fullName o role.");
  }

  if (nextRole && isMvzViewRole(nextRole) && !licenseNumber) {
    return apiError("INVALID_PAYLOAD", "licenseNumber es requerido para asignar roles MVZ.");
  }

  const supabase = getSupabaseProvisioningClient();
  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return apiError("USER_NOT_FOUND", "No existe usuario en este tenant con ese id.", 404);
  }

  if (nextRole) {
    const tenantRoleResult = await supabase
      .from("tenant_roles")
      .select("id,key")
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .eq("key", nextRole)
      .maybeSingle();

    if (tenantRoleResult.error || !tenantRoleResult.data) {
      return apiError("ROLE_NOT_FOUND", "No existe rol configurado en este tenant.", 404);
    }

    const clearRoles = await supabase
      .from("tenant_user_roles")
      .delete()
      .eq("membership_id", membershipResult.data.id);

    if (clearRoles.error) {
      return apiError("USER_ROLE_CLEAR_FAILED", clearRoles.error.message, 400);
    }

    const assignRole = await supabase.from("tenant_user_roles").insert({
      membership_id: membershipResult.data.id,
      tenant_role_id: tenantRoleResult.data.id,
      assigned_by_user_id: auth.context.user.id,
    });

    if (assignRole.error) {
      return apiError("USER_ROLE_ASSIGN_FAILED", assignRole.error.message, 400);
    }
  }

  if (fullName) {
    await supabase
      .from("producers")
      .update({ full_name: fullName })
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .eq("user_id", userId);

    await supabase
      .from("mvz_profiles")
      .update({
        full_name: fullName,
        ...(licenseNumber ? { license_number: licenseNumber } : {}),
      })
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .eq("user_id", userId);
  } else if (nextRole && isMvzViewRole(nextRole) && licenseNumber) {
    await supabase
      .from("mvz_profiles")
      .update({ license_number: licenseNumber })
      .eq("owner_tenant_id", auth.context.user.tenantId)
      .eq("user_id", userId);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.users",
    resourceId: userId,
    payload: {
      fullName: fullName ?? null,
      role: nextRole ?? null,
    },
  });

  const users = await fetchUsers(auth.context.user.tenantId);
  const updatedUser = users.find((user) => user.id === userId);

  return apiSuccess({
    user: updatedUser ?? null,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.delete"],
    resource: "admin.users",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: DeleteAdminUserBody;
  try {
    body = (await request.json()) as DeleteAdminUserBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const userId = body.id?.trim();
  if (!userId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de usuario.");
  }

  const supabase = getSupabaseProvisioningClient();
  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return apiError("USER_NOT_FOUND", "No existe usuario en este tenant con ese id.", 404);
  }

  const profileUpdateResult = await supabase
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", userId);

  if (profileUpdateResult.error) {
    return apiError("USER_SOFT_DELETE_FAILED", profileUpdateResult.error.message, 400);
  }

  const membershipUpdateResult = await supabase
    .from("tenant_memberships")
    .update({ status: "suspended" })
    .eq("id", membershipResult.data.id);

  if (membershipUpdateResult.error) {
    return apiError("MEMBERSHIP_SUSPEND_FAILED", membershipUpdateResult.error.message, 400);
  }

  await supabase
    .from("producers")
    .update({ status: "inactive" })
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .eq("user_id", userId);

  await supabase
    .from("mvz_profiles")
    .update({ status: "inactive" })
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .eq("user_id", userId);

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "admin.users",
    resourceId: userId,
    payload: {
      hardDelete: body.hardDelete ?? false,
      strategy: "soft-delete",
    },
  });

  return apiSuccess({ id: userId, status: "suspended" });
}
