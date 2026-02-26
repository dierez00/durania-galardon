import { resolveTenant } from "@/server/tenants/resolveTenant";
import {
  isAppRole,
  isPermissionKey,
  isTenantAdminRole,
  redirectPathForRole,
  type AppRole,
  type PermissionKey,
} from "@/shared/lib/auth";
import {
  createSupabaseRlsServerClient,
  getSupabaseProvisioningClient,
} from "@/server/auth/supabase";

type TenantType = "government" | "producer" | "mvz";

interface UserContextRow {
  user_id: string;
  tenant_id: string;
  tenant_type: TenantType;
  tenant_slug: string;
  role_key: string;
  role_priority: number;
}

interface PermissionRow {
  permission_key: string;
}

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
  tenantType: TenantType;
  panelType: TenantType;
  permissions: PermissionKey[];
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

function resolveTenantSlugFromRequest(request: Request): string | null {
  const tenantHeader = request.headers.get("x-tenant-slug-resolved");
  const resolved = resolveTenant(request);
  return tenantHeader ?? resolved?.tenantSlug ?? null;
}

async function resolvePrimaryContext(
  accessToken: string,
  preferredTenantSlug: string | null
): Promise<{ row: UserContextRow; panelType: TenantType; permissions: PermissionKey[] } | { error: AuthError }> {
  const supabase = createSupabaseRlsServerClient(accessToken);

  const authUserResult = await supabase.auth.getUser(accessToken);
  if (authUserResult.error || !authUserResult.data.user) {
    return { error: authError(401, "UNAUTHORIZED", "Token invalido o expirado.") };
  }

  let contextQuery = supabase
    .from("v_user_context")
    .select("user_id,tenant_id,tenant_type,tenant_slug,role_key,role_priority")
    .order("role_priority", { ascending: true })
    .limit(1);

  if (preferredTenantSlug) {
    contextQuery = contextQuery.eq("tenant_slug", preferredTenantSlug);
  }

  let contextResult = await contextQuery.maybeSingle();

  if ((contextResult.error || !contextResult.data) && preferredTenantSlug) {
    contextResult = await supabase
      .from("v_user_context")
      .select("user_id,tenant_id,tenant_type,tenant_slug,role_key,role_priority")
      .order("role_priority", { ascending: true })
      .limit(1)
      .maybeSingle();
  }

  if (contextResult.error || !contextResult.data) {
    return {
      error: authError(
        403,
        "ROLE_NOT_FOUND",
        "No existe contexto de usuario activo en v_user_context."
      ),
    };
  }

  const row = contextResult.data as UserContextRow;
  if (!isAppRole(row.role_key)) {
    return {
      error: authError(403, "ROLE_NOT_FOUND", "El rol principal no es valido para la aplicacion."),
    };
  }

  const permissionsResult = await supabase
    .from("v_user_permissions")
    .select("permission_key")
    .eq("tenant_id", row.tenant_id);

  const permissions = (permissionsResult.data ?? [])
    .map((item) => (item as PermissionRow).permission_key)
    .filter(isPermissionKey);

  const panelResult = await supabase.rpc("auth_get_panel_type");
  const panelType = panelResult.data;

  if (panelType !== "government" && panelType !== "producer" && panelType !== "mvz") {
    return {
      row,
      permissions,
      panelType: row.tenant_type,
    };
  }

  return {
    row,
    permissions,
    panelType,
  };
}

export async function resolveTenantContextFromRequest(
  request: Request
): Promise<{ tenant: TenantContextResolution } | { error: AuthError }> {
  const tenantSlug = resolveTenantSlugFromRequest(request);
  if (!tenantSlug) {
    return {
      error: authError(400, "TENANT_NOT_RESOLVED", "No se pudo resolver tenant para la solicitud."),
    };
  }

  const provisioning = getSupabaseProvisioningClient();
  const tenantResult = await provisioning
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

export async function resolveSingleRoleForUser(
  _userId: string,
  _tenantId: string
): Promise<RoleResolution> {
  return {
    role: null,
    error: authError(500, "ROLE_QUERY_FAILED", "Use v_user_context para resolver el rol principal."),
  };
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

  const preferredTenantSlug = resolveTenantSlugFromRequest(request);
  const contextResult = await resolvePrimaryContext(accessToken, preferredTenantSlug);
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const supabase = createSupabaseRlsServerClient(accessToken);
  const userResult = await supabase.auth.getUser(accessToken);
  if (userResult.error || !userResult.data.user) {
    return { error: authError(401, "UNAUTHORIZED", "Token invalido o expirado.") };
  }

  return {
    user: {
      id: userResult.data.user.id,
      email: userResult.data.user.email ?? "",
      role: contextResult.row.role_key as AppRole,
      tenantId: contextResult.row.tenant_id,
      tenantSlug: contextResult.row.tenant_slug,
      tenantType: contextResult.row.tenant_type,
      panelType: contextResult.panelType,
      permissions: contextResult.permissions,
      accessToken,
    },
  };
}
