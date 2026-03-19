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
import {
  isProducerAccessDebugEnabled,
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

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

  const debugProducerAccess = isProducerAccessDebugEnabled() && isProducerViewRole(user.role);
  const debugContext = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    panelType: user.panelType,
    uppId,
  };

  if (debugProducerAccess) {
    logProducerAccessServer("hasUppScopeAccess:start", debugContext);
  }

  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const directUppResult = await supabase.from("upps").select("id").eq("id", uppId).maybeSingle();

  if (debugProducerAccess) {
    logProducerAccessServer("hasUppScopeAccess:direct-rls-select", {
      ...debugContext,
      found: Boolean(directUppResult.data?.id),
      error: summarizeProducerAccessError(directUppResult.error),
    });
  }

  if (!directUppResult.error && directUppResult.data) {
    if (debugProducerAccess) {
      logProducerAccessServer("hasUppScopeAccess:granted", {
        ...debugContext,
        source: "rls_select",
      });
    }
    return true;
  }

  const uppScopeResult = await supabase.rpc("auth_has_upp_access", {
    p_upp_id: uppId,
    p_min_level: "viewer",
  });

  if (debugProducerAccess) {
    logProducerAccessServer("hasUppScopeAccess:rpc-auth-has-upp-access", {
      ...debugContext,
      granted: uppScopeResult.data === true,
      error: summarizeProducerAccessError(uppScopeResult.error),
    });
  }

  if (!uppScopeResult.error && uppScopeResult.data === true) {
    if (debugProducerAccess) {
      logProducerAccessServer("hasUppScopeAccess:granted", {
        ...debugContext,
        source: "rpc_auth_has_upp_access",
      });
    }
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

    if (debugProducerAccess) {
      logProducerAccessServer("hasUppScopeAccess:producer-profile-by-user", {
        ...debugContext,
        found: Boolean(producerResult.data?.id),
        producerId: producerResult.data?.id ?? null,
        error: summarizeProducerAccessError(producerResult.error),
      });
    }

    if (!producerResult.error && producerResult.data) {
      const producerUppResult = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("producer_id", producerResult.data.id)
        .eq("id", uppId)
        .maybeSingle();

      if (debugProducerAccess) {
        logProducerAccessServer("hasUppScopeAccess:producer-upp-check", {
          ...debugContext,
          producerId: producerResult.data.id,
          found: Boolean(producerUppResult.data?.id),
          error: summarizeProducerAccessError(producerUppResult.error),
        });
      }

      if (!producerUppResult.error && producerUppResult.data) {
        if (debugProducerAccess) {
          logProducerAccessServer("hasUppScopeAccess:granted", {
            ...debugContext,
            source: "producer_profile_lookup",
            producerId: producerResult.data.id,
          });
        }
        return true;
      }
    } else if (debugProducerAccess && !producerResult.error) {
      const tenantProducersResult = await supabaseAdmin
        .from("producers")
        .select("id,user_id,status")
        .eq("owner_tenant_id", user.tenantId)
        .limit(5);

      logProducerAccessServer("hasUppScopeAccess:producer-profile-by-tenant-diagnostic", {
        ...debugContext,
        foundAny: (tenantProducersResult.data ?? []).length > 0,
        error: summarizeProducerAccessError(tenantProducersResult.error),
        tenantProducers:
          (tenantProducersResult.data ?? []).slice(0, 5).map((producer) => ({
            id: producer.id,
            userId: producer.user_id,
            status: producer.status,
          })),
      });
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

  if (debugProducerAccess) {
    logProducerAccessServer("hasUppScopeAccess:denied", debugContext);
  }

  return false;
}

export async function resolveAccessibleUppIds(
  user: AuthenticatedRequestUser
): Promise<string[]> {
  const debugProducerAccess = isProducerAccessDebugEnabled() && isProducerViewRole(user.role);
  const debugContext = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    panelType: user.panelType,
  };

  if (debugProducerAccess) {
    logProducerAccessServer("resolveAccessibleUppIds:start", debugContext);
  }

  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const uppResult = await supabase.from("upps").select("id");

  if (debugProducerAccess) {
    const rlsVisibleIds = ((uppResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
    logProducerAccessServer("resolveAccessibleUppIds:rls-probe", {
      ...debugContext,
      error: summarizeProducerAccessError(uppResult.error),
      rlsVisibleUpps: sampleProducerAccessIds(rlsVisibleIds),
    });
  }

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

  if (debugProducerAccess) {
    const directAccessIds = ((directAccessResult.data ?? []) as Array<{ upp_id: string | null }>)
      .map((row) => row.upp_id)
      .filter((uppId): uppId is string => Boolean(uppId));
    logProducerAccessServer("resolveAccessibleUppIds:user-upp-access", {
      ...debugContext,
      error: summarizeProducerAccessError(directAccessResult.error),
      directAccessUpps: sampleProducerAccessIds(directAccessIds),
    });
  }

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

    if (debugProducerAccess) {
      logProducerAccessServer("resolveAccessibleUppIds:producer-profile-by-user", {
        ...debugContext,
        found: Boolean(producerResult.data?.id),
        producerId: producerResult.data?.id ?? null,
        error: summarizeProducerAccessError(producerResult.error),
      });
    }

    if (!producerResult.error && producerResult.data) {
      const producerUppsResult = await supabaseAdmin
        .from("upps")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("producer_id", producerResult.data.id);

      if (debugProducerAccess) {
        const producerUppIds = ((producerUppsResult.data ?? []) as Array<{ id: string }>).map(
          (row) => row.id
        );
        logProducerAccessServer("resolveAccessibleUppIds:producer-upps", {
          ...debugContext,
          producerId: producerResult.data.id,
          error: summarizeProducerAccessError(producerUppsResult.error),
          producerUpps: sampleProducerAccessIds(producerUppIds),
        });
      }

      if (!producerUppsResult.error) {
        (producerUppsResult.data ?? []).forEach((row) => uppIds.add(row.id));
      }
    } else if (debugProducerAccess && !producerResult.error) {
      const tenantProducersResult = await supabaseAdmin
        .from("producers")
        .select("id,user_id,status")
        .eq("owner_tenant_id", user.tenantId)
        .limit(5);

      logProducerAccessServer("resolveAccessibleUppIds:producer-profile-by-tenant-diagnostic", {
        ...debugContext,
        foundAny: (tenantProducersResult.data ?? []).length > 0,
        error: summarizeProducerAccessError(tenantProducersResult.error),
        tenantProducers:
          (tenantProducersResult.data ?? []).slice(0, 5).map((producer) => ({
            id: producer.id,
            userId: producer.user_id,
            status: producer.status,
          })),
      });
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

  const resolvedIds = [...uppIds];

  if (debugProducerAccess) {
    logProducerAccessServer("resolveAccessibleUppIds:resolved", {
      ...debugContext,
      accessibleUpps: sampleProducerAccessIds(resolvedIds),
    });
  }

  return resolvedIds;
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
