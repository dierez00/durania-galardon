import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    resource: "producer.settings.ranchos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const canViewRanchos = auth.context.hasAnyPermission([
    "producer.upp.read",
    "producer.upp.write",
    "producer.employees.read",
    "producer.employees.write",
  ]);

  if (!canViewRanchos) {
    return apiError("FORBIDDEN", "No cuenta con permisos para consultar los ranchos del tenant.", 403);
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({
      upps: [],
      canViewMemberAccess: auth.context.hasAnyPermission([
        "producer.employees.read",
        "producer.employees.write",
      ]),
      canManageAssignments: auth.context.hasPermission("producer.employees.write"),
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [uppsResult, accessResult, membershipsResult] = await Promise.all([
    supabaseAdmin
      .from("upps")
      .select("id,name,upp_code,status,herd_limit,hectares_total")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("id", accessibleUppIds)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("user_upp_access")
      .select("user_id,upp_id,access_level,status")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("upp_id", accessibleUppIds)
      .eq("status", "active"),
    supabaseAdmin
      .from("tenant_memberships")
      .select("id,user_id,status,joined_at")
      .eq("tenant_id", auth.context.user.tenantId),
  ]);

  if (uppsResult.error || accessResult.error || membershipsResult.error) {
    return apiError("PRODUCER_SETTINGS_RANCHOS_QUERY_FAILED", "No fue posible cargar ranchos.", 500, {
      upps: uppsResult.error?.message,
      access: accessResult.error?.message,
      memberships: membershipsResult.error?.message,
    });
  }

  const memberships = membershipsResult.data ?? [];
  const userIds = Array.from(new Set(memberships.map((membership) => membership.user_id)));

  const [profilesResult, rolesResult] = await Promise.all([
    userIds.length > 0
      ? supabaseAdmin.from("profiles").select("id,email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    memberships.length > 0
      ? supabaseAdmin
          .from("tenant_user_roles")
          .select("membership_id,tenant_role_id,tenant_role:tenant_roles(id,key,name,is_system)")
          .in(
            "membership_id",
            memberships.map((membership) => membership.id)
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || rolesResult.error) {
    return apiError(
      "PRODUCER_SETTINGS_RANCHOS_JOIN_FAILED",
      "No fue posible resolver los miembros asignados.",
      500,
      {
        profiles: profilesResult.error?.message,
        roles: rolesResult.error?.message,
      }
    );
  }

  const membershipByUserId = new Map(memberships.map((membership) => [membership.user_id, membership]));
  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const roleByMembershipId = new Map<
    string,
    { id: string | null; key: string | null; name: string | null; isSystem: boolean }
  >();

  (rolesResult.data ?? []).forEach((row) => {
    if (roleByMembershipId.has(row.membership_id)) {
      return;
    }

    const role = Array.isArray(row.tenant_role) ? row.tenant_role[0] : row.tenant_role;
    roleByMembershipId.set(row.membership_id, {
      id: role?.id ?? row.tenant_role_id ?? null,
      key: role?.key ?? null,
      name: role?.name ?? null,
      isSystem: role?.is_system === true,
    });
  });

  const memberAccessByUppId = (accessResult.data ?? []).reduce(
    (acc, row) => {
      const membership = membershipByUserId.get(row.user_id);
      if (!membership) {
        return acc;
      }

      const roleInfo = roleByMembershipId.get(membership.id) ?? {
        id: null,
        key: null,
        name: null,
        isSystem: false,
      };
      const current = acc.get(row.upp_id) ?? [];
      current.push({
        membershipId: membership.id,
        userId: row.user_id,
        email: profileByUserId.get(row.user_id)?.email ?? "",
        membershipStatus: membership.status,
        roleId: roleInfo.id,
        roleKey: roleInfo.key,
        roleName: roleInfo.name,
        isSystemRole: roleInfo.isSystem,
        accessLevel: row.access_level,
        accessStatus: row.status,
      });
      acc.set(row.upp_id, current);
      return acc;
    },
    new Map<
      string,
      Array<{
        membershipId: string;
        userId: string;
        email: string;
        membershipStatus: string;
        roleId: string | null;
        roleKey: string | null;
        roleName: string | null;
        isSystemRole: boolean;
        accessLevel: string;
        accessStatus: string;
      }>
    >()
  );

  return apiSuccess({
    upps: (uppsResult.data ?? []).map((upp) => ({
      id: upp.id,
      name: upp.name,
      uppCode: upp.upp_code,
      status: upp.status,
      herdLimit: upp.herd_limit,
      hectaresTotal: upp.hectares_total,
      assignedMembers: memberAccessByUppId.get(upp.id) ?? [],
    })),
    canViewMemberAccess: auth.context.hasAnyPermission([
      "producer.employees.read",
      "producer.employees.write",
    ]),
    canManageAssignments: auth.context.hasPermission("producer.employees.write"),
  });
}
