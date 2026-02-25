import { resolveTenant } from "@/server/tenants/resolveTenant";
import {
  isAppRole,
  isTenantAdminRole,
  redirectPathForRole,
  type AppRole,
} from "@/shared/lib/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export interface AuthError {
  status: number;
  code: string;
  message: string;
}

export interface RoleResolution {
  role: AppRole | null;
  error?: AuthError;
}

export interface TenantContextResolution {
  tenantId: string;
  tenantSlug: string;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: AppRole;
  tenantId: string;
  tenantSlug: string;
  accessToken: string;
}

function parseBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function authError(status: number, code: string, message: string): AuthError {
  return { status, code, message };
}

export async function resolveTenantContextFromRequest(
  request: Request
): Promise<{ tenant: TenantContextResolution } | { error: AuthError }> {
  const tenantHeader = request.headers.get("x-tenant-slug-resolved");
  const resolved = resolveTenant(request);
  const tenantSlug = tenantHeader ?? resolved?.tenantSlug ?? null;

  if (!tenantSlug) {
    return {
      error: authError(400, "TENANT_NOT_RESOLVED", "No se pudo resolver tenant para la solicitud."),
    };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const tenantResult = await supabaseAdmin
    .from("tenants")
    .select("id,slug,status")
    .eq("slug", tenantSlug)
    .eq("status", "active")
    .maybeSingle();

  if (tenantResult.error || !tenantResult.data) {
    return {
      error: authError(404, "TENANT_NOT_FOUND", "No existe tenant activo para el slug solicitado."),
    };
  }

  return {
    tenant: {
      tenantId: tenantResult.data.id,
      tenantSlug: tenantResult.data.slug,
    },
  };
}

type TenantRoleRow = {
  tenant_role:
    | {
        key: string;
      }[]
    | {
        key: string;
      }
    | null;
};

export async function resolveSingleRoleForUser(
  userId: string,
  tenantId: string
): Promise<RoleResolution> {
  const supabaseAdmin = getSupabaseAdminClient();

  const membershipResult = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return {
      role: null,
      error: authError(403, "ROLE_NOT_FOUND", "El usuario no pertenece al tenant o no esta activo."),
    };
  }

  const rolesResult = await supabaseAdmin
    .from("tenant_user_roles")
    .select("tenant_role:tenant_roles(key)")
    .eq("membership_id", membershipResult.data.id);

  if (rolesResult.error) {
    return {
      role: null,
      error: authError(500, "ROLE_QUERY_FAILED", "No fue posible consultar el rol del usuario."),
    };
  }

  const rows = (rolesResult.data ?? []) as unknown as TenantRoleRow[];
  const roles = rows
    .flatMap((row) => {
      if (!row.tenant_role) {
        return [];
      }

      if (Array.isArray(row.tenant_role)) {
        return row.tenant_role.map((item) => item.key);
      }

      return [row.tenant_role.key];
    })
    .filter(isAppRole);

  if (roles.length === 0) {
    return {
      role: null,
      error: authError(403, "ROLE_NOT_FOUND", "El usuario no tiene rol tenant asignado."),
    };
  }

  if (roles.length > 1) {
    return {
      role: null,
      error: authError(403, "ROLE_MULTI_ASSIGNED", "El usuario tiene multiples roles tenant asignados."),
    };
  }

  return { role: roles[0] };
}

export function resolveRedirectByRole(role: AppRole): string {
  return redirectPathForRole(role);
}

export function hasTenantAdminAccess(user: AuthenticatedRequestUser): boolean {
  return isTenantAdminRole(user.role);
}

export async function resolveAuthenticatedRequestUser(
  request: Request
): Promise<{ user: AuthenticatedRequestUser } | { error: AuthError }> {
  const accessToken = parseBearerToken(request);
  if (!accessToken) {
    return { error: authError(401, "UNAUTHORIZED", "Falta token de autenticacion.") };
  }

  const tenantResult = await resolveTenantContextFromRequest(request);
  if ("error" in tenantResult) {
    return { error: tenantResult.error };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const authUserResult = await supabaseAdmin.auth.getUser(accessToken);
  if (authUserResult.error || !authUserResult.data.user) {
    return { error: authError(401, "UNAUTHORIZED", "Token invalido o expirado.") };
  }

  const roleResult = await resolveSingleRoleForUser(
    authUserResult.data.user.id,
    tenantResult.tenant.tenantId
  );
  if (!roleResult.role || roleResult.error) {
    return {
      error:
        roleResult.error ??
        authError(403, "ROLE_NOT_FOUND", "La cuenta no tiene un rol valido para acceder."),
    };
  }

  return {
    user: {
      id: authUserResult.data.user.id,
      email: authUserResult.data.user.email ?? "",
      role: roleResult.role,
      tenantId: tenantResult.tenant.tenantId,
      tenantSlug: tenantResult.tenant.tenantSlug,
      accessToken,
    },
  };
}
