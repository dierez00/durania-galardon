import { apiError } from "@/shared/lib/api-response";
import {
  ALL_PERMISSION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  isPermissionKey,
  isMvzViewRole,
  isProducerViewRole,
  isTenantAdminRole,
  type AppRole,
  type PermissionKey,
} from "@/shared/lib/auth";
import {
  resolveAuthenticatedRequestUser,
  type AuthenticatedRequestUser,
} from "@/server/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

export interface RequireAuthorizedOptions {
  roles?: AppRole[];
  permissions?: PermissionKey[];
  requireAllPermissions?: boolean;
  scope?: {
    uppId?: string | null;
    allowTenantAdminBypass?: boolean;
  };
  resource?: string;
}

export interface AuthorizedContext {
  user: AuthenticatedRequestUser;
  permissions: PermissionKey[];
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  canAccessUpp: (uppId: string) => Promise<boolean>;
  getAccessibleUppIds: () => Promise<string[]>;
}

function dedupePermissions(values: PermissionKey[]): PermissionKey[] {
  return [...new Set(values)];
}

async function resolveRoleIds(user: AuthenticatedRequestUser): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdminClient();
  const membershipResult = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return [];
  }

  const rolesResult = await supabaseAdmin
    .from("tenant_user_roles")
    .select("tenant_role_id")
    .eq("membership_id", membershipResult.data.id);

  if (rolesResult.error) {
    return [];
  }

  return (rolesResult.data ?? []).map((row) => row.tenant_role_id);
}

export async function resolveUserPermissions(
  user: AuthenticatedRequestUser
): Promise<PermissionKey[]> {
  if (isTenantAdminRole(user.role)) {
    return ALL_PERMISSION_KEYS;
  }

  const roleIds = await resolveRoleIds(user);
  const fallback = ROLE_DEFAULT_PERMISSIONS[user.role] ?? [];

  if (roleIds.length === 0) {
    return fallback;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const permissionsResult = await supabaseAdmin
    .from("tenant_role_permissions")
    .select("permission:permissions(key)")
    .in("tenant_role_id", roleIds);

  if (permissionsResult.error) {
    return fallback;
  }

  type PermissionRow = {
    permission:
      | {
          key: string;
        }
      | {
          key: string;
        }[]
      | null;
  };

  const parsedKeys = ((permissionsResult.data ?? []) as PermissionRow[])
    .flatMap((row) => {
      if (!row.permission) {
        return [] as string[];
      }

      if (Array.isArray(row.permission)) {
        return row.permission.map((item) => item.key).filter((key): key is string => Boolean(key));
      }

      return row.permission.key ? [row.permission.key] : [];
    })
    .filter(isPermissionKey);

  return dedupePermissions([...fallback, ...parsedKeys]);
}

export async function hasUppScopeAccess(
  user: AuthenticatedRequestUser,
  uppId: string
): Promise<boolean> {
  if (!uppId) {
    return false;
  }

  if (isTenantAdminRole(user.role)) {
    return true;
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const directAccessResult = await supabaseAdmin
    .from("user_upp_access")
    .select("id")
    .eq("tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .eq("upp_id", uppId)
    .eq("status", "active")
    .maybeSingle();

  if (!directAccessResult.error && directAccessResult.data) {
    return true;
  }

  if (isProducerViewRole(user.role)) {
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id")
      .eq("tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!producerResult.error && producerResult.data) {
      const uppResult = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("producer_id", producerResult.data.id)
        .eq("id", uppId)
        .maybeSingle();

      if (!uppResult.error && uppResult.data) {
        return true;
      }
    }
  }

  if (isMvzViewRole(user.role)) {
    const mvzResult = await supabaseAdmin
      .from("mvz_profiles")
      .select("id")
      .eq("tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!mvzResult.error && mvzResult.data) {
      const assignmentResult = await supabaseAdmin
        .from("mvz_upp_assignments")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("mvz_profile_id", mvzResult.data.id)
        .eq("upp_id", uppId)
        .eq("status", "active")
        .maybeSingle();

      if (!assignmentResult.error && assignmentResult.data) {
        return true;
      }
    }
  }

  return false;
}

export async function resolveAccessibleUppIds(
  user: AuthenticatedRequestUser
): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdminClient();

  if (isTenantAdminRole(user.role)) {
    const uppResult = await supabaseAdmin
      .from("upps")
      .select("id")
      .eq("tenant_id", user.tenantId);

    if (uppResult.error) {
      return [];
    }

    return (uppResult.data ?? []).map((row) => row.id);
  }

  const uppIds = new Set<string>();

  const directAccessResult = await supabaseAdmin
    .from("user_upp_access")
    .select("upp_id")
    .eq("tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!directAccessResult.error) {
    (directAccessResult.data ?? []).forEach((row) => {
      if (row.upp_id) {
        uppIds.add(row.upp_id);
      }
    });
  }

  if (isProducerViewRole(user.role)) {
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id")
      .eq("tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!producerResult.error && producerResult.data) {
      const producerUppsResult = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("producer_id", producerResult.data.id);

      if (!producerUppsResult.error) {
        (producerUppsResult.data ?? []).forEach((row) => uppIds.add(row.id));
      }
    }
  }

  if (isMvzViewRole(user.role)) {
    const mvzProfileResult = await supabaseAdmin
      .from("mvz_profiles")
      .select("id")
      .eq("tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!mvzProfileResult.error && mvzProfileResult.data) {
      const mvzAssignmentsResult = await supabaseAdmin
        .from("mvz_upp_assignments")
        .select("upp_id")
        .eq("tenant_id", user.tenantId)
        .eq("mvz_profile_id", mvzProfileResult.data.id)
        .eq("status", "active");

      if (!mvzAssignmentsResult.error) {
        (mvzAssignmentsResult.data ?? []).forEach((row) => {
          if (row.upp_id) {
            uppIds.add(row.upp_id);
          }
        });
      }
    }
  }

  return [...uppIds];
}

export async function requireAuthorized(
  request: Request,
  options: RequireAuthorizedOptions = {}
): Promise<{ ok: true; context: AuthorizedContext } | { ok: false; response: Response }> {
  const authResult = await resolveAuthenticatedRequestUser(request);

  if ("error" in authResult) {
    return {
      ok: false,
      response: apiError(authResult.error.code, authResult.error.message, authResult.error.status),
    };
  }

  const user = authResult.user;
  const permissions = await resolveUserPermissions(user);
  const roleAllowed = !options.roles || options.roles.includes(user.role);

  if (!roleAllowed) {
    await logAuditEvent({
      request,
      action: "fraud_attempt",
      resource: options.resource ?? "authorization",
      user,
      payload: {
        reason: "ROLE_FORBIDDEN",
        requiredRoles: options.roles ?? [],
        currentRole: user.role,
      },
    });

    return {
      ok: false,
      response: apiError("FORBIDDEN", "El rol no tiene acceso a este recurso.", 403),
    };
  }

  if (options.permissions && options.permissions.length > 0) {
    const hasAll = options.permissions.every((permission) => permissions.includes(permission));
    const hasAny = options.permissions.some((permission) => permissions.includes(permission));
    const permissionAllowed = options.requireAllPermissions ? hasAll : hasAny;

    if (!permissionAllowed) {
      await logAuditEvent({
        request,
        action: "fraud_attempt",
        resource: options.resource ?? "authorization",
        user,
        payload: {
          reason: "PERMISSION_FORBIDDEN",
          requiredPermissions: options.permissions,
          currentPermissions: permissions,
        },
      });

      return {
        ok: false,
        response: apiError("FORBIDDEN", "No cuenta con permisos para esta operacion.", 403),
      };
    }
  }

  if (options.scope?.uppId) {
    const allowTenantAdminBypass = options.scope.allowTenantAdminBypass ?? true;
    if (!(allowTenantAdminBypass && isTenantAdminRole(user.role))) {
      const canAccess = await hasUppScopeAccess(user, options.scope.uppId);
      if (!canAccess) {
        await logAuditEvent({
          request,
          action: "fraud_attempt",
          resource: options.resource ?? "authorization",
          user,
          resourceId: options.scope.uppId,
          payload: {
            reason: "UPP_SCOPE_FORBIDDEN",
            uppId: options.scope.uppId,
          },
        });

        return {
          ok: false,
          response: apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403),
        };
      }
    }
  }

  return {
    ok: true,
    context: {
      user,
      permissions,
      hasPermission: (permission) => permissions.includes(permission),
      hasAnyPermission: (keys) => keys.some((key) => permissions.includes(key)),
      hasAllPermissions: (keys) => keys.every((key) => permissions.includes(key)),
      canAccessUpp: async (uppId) => hasUppScopeAccess(user, uppId),
      getAccessibleUppIds: async () => resolveAccessibleUppIds(user),
    },
  };
}
