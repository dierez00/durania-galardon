import { apiError } from "@/shared/lib/api-response";
import {
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
import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
import { requirePermission } from "@/server/auth/permissions";
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

export async function resolveUserPermissions(
  user: AuthenticatedRequestUser
): Promise<PermissionKey[]> {
  return user.permissions;
}

export async function hasUppScopeAccess(
  user: AuthenticatedRequestUser,
  uppId: string
): Promise<boolean> {
  if (!uppId) {
    return false;
  }

  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const uppResult = await supabase.from("upps").select("id").eq("id", uppId).maybeSingle();
  if (!uppResult.error && uppResult.data) {
    return true;
  }

  const uppScopeResult = await supabase.rpc("auth_has_upp_access", {
    p_upp_id: uppId,
    p_min_level: "viewer",
  });

  if (!uppScopeResult.error && uppScopeResult.data === true) {
    return true;
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (isProducerViewRole(user.role)) {
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id")
      .eq("owner_tenant_id", user.tenantId)
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
      .eq("owner_tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!mvzResult.error && mvzResult.data) {
      const assignmentResult = await supabaseAdmin
        .from("mvz_upp_assignments")
        .select("id")
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
  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const uppResult = await supabase.from("upps").select("id");

  if (uppResult.error) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdminClient();
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
      .eq("owner_tenant_id", user.tenantId)
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
      .eq("owner_tenant_id", user.tenantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!mvzProfileResult.error && mvzProfileResult.data) {
      const mvzAssignmentsResult = await supabaseAdmin
        .from("mvz_upp_assignments")
        .select("upp_id")
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
    const permissionChecks = await Promise.all(
      options.permissions.map((permission) =>
        requirePermission(user.accessToken, user.tenantId, permission)
      )
    );

    const hasAll = permissionChecks.every(Boolean);
    const hasAny = permissionChecks.some(Boolean);
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
