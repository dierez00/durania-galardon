import { resolveTenant } from "@/server/tenants/resolveTenant";
import {
  normalizeAppRole,
  isPermissionKey,
  isTenantAdminRole,
  redirectPathForRole,
  ROLE_DEFAULT_PERMISSIONS,
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

interface TenantMembershipRow {
  id: string;
  tenant_id: string;
}

interface TenantRow {
  id: string;
  type: TenantType;
  slug: string;
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
  displayName: string | null;
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

function resolveTenantTypePriority(type: TenantType): number {
  if (type === "government") {
    return 1;
  }
  if (type === "mvz") {
    return 2;
  }
  return 3;
}

function resolveDefaultRoleForTenantType(type: TenantType): AppRole {
  if (type === "government") {
    return "tenant_admin";
  }
  if (type === "mvz") {
    return "mvz_government";
  }
  return "producer";
}

async function resolveContextFallback(
  userId: string,
  preferredTenantSlug: string | null
): Promise<{ row: UserContextRow; usedDefaultRole: boolean } | null> {
  const provisioning = getSupabaseProvisioningClient();

  const membershipResult = await provisioning
    .from("tenant_memberships")
    .select("id,tenant_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipResult.error || !membershipResult.data || membershipResult.data.length === 0) {
    return null;
  }

  const memberships = membershipResult.data as TenantMembershipRow[];
  const tenantIds = memberships.map((item) => item.tenant_id);

  const tenantResult = await provisioning
    .from("tenants")
    .select("id,type,slug")
    .in("id", tenantIds)
    .eq("status", "active");

  if (tenantResult.error || !tenantResult.data || tenantResult.data.length === 0) {
    return null;
  }

  let tenants = tenantResult.data as TenantRow[];
  if (preferredTenantSlug) {
    const preferredTenant = tenants.find((tenant) => tenant.slug === preferredTenantSlug);
    if (preferredTenant) {
      tenants = [preferredTenant];
    }
  }

  const selectedTenant = [...tenants].sort(
    (a, b) => resolveTenantTypePriority(a.type) - resolveTenantTypePriority(b.type)
  )[0];

  if (!selectedTenant) {
    return null;
  }

  const selectedMembership = memberships.find(
    (membership) => membership.tenant_id === selectedTenant.id
  );

  if (!selectedMembership) {
    return null;
  }

  const roleResult = await provisioning
    .from("tenant_user_roles")
    .select("tenant_roles(key,priority)")
    .eq("membership_id", selectedMembership.id);

  let selectedRole: AppRole | null = null;
  let selectedPriority = 100;
  let usedDefaultRole = false;

  if (!roleResult.error && roleResult.data) {
    const roleRows = roleResult.data as Array<{
      tenant_roles?: { key?: string; priority?: number } | Array<{ key?: string; priority?: number }>;
    }>;

    const flattened = roleRows
      .flatMap((entry) =>
        Array.isArray(entry.tenant_roles)
          ? entry.tenant_roles
          : entry.tenant_roles
          ? [entry.tenant_roles]
          : []
      )
      .map((role) => ({
        role: normalizeAppRole(role.key),
        priority: role.priority ?? 100,
      }))
      .filter((item): item is { role: AppRole; priority: number } => item.role !== null)
      .sort((a, b) => a.priority - b.priority);

    if (flattened.length > 0) {
      selectedRole = flattened[0].role;
      selectedPriority = flattened[0].priority;
    }
  }

  if (!selectedRole) {
    selectedRole = resolveDefaultRoleForTenantType(selectedTenant.type);
    selectedPriority = 1;
    usedDefaultRole = true;
  }

  return {
    row: {
      user_id: userId,
      tenant_id: selectedTenant.id,
      tenant_type: selectedTenant.type,
      tenant_slug: selectedTenant.slug,
      role_key: selectedRole,
      role_priority: selectedPriority,
    },
    usedDefaultRole,
  };
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

  let row: UserContextRow | null = contextResult.data as UserContextRow | null;
  let usedDefaultRole = false;

  if (!row || !normalizeAppRole(row.role_key)) {
    const fallback = await resolveContextFallback(authUserResult.data.user.id, preferredTenantSlug);
    if (fallback) {
      row = fallback.row;
      usedDefaultRole = fallback.usedDefaultRole;
    }
  }

  if (!row) {
    return {
      error: authError(
        403,
        "ROLE_NOT_FOUND",
        "No existe contexto de usuario activo en v_user_context."
      ),
    };
  }

  const normalizedRole = normalizeAppRole(row.role_key);
  if (!normalizedRole) {
    return {
      error: authError(403, "ROLE_NOT_FOUND", "El rol principal no es valido para la aplicacion."),
    };
  }
  row.role_key = normalizedRole;

  const permissionsResult = await supabase
    .from("v_user_permissions")
    .select("permission_key")
    .eq("tenant_id", row.tenant_id);

  let permissions = (permissionsResult.data ?? [])
    .map((item) => (item as PermissionRow).permission_key)
    .filter(isPermissionKey);

  if (permissions.length === 0 && usedDefaultRole) {
    permissions = [...ROLE_DEFAULT_PERMISSIONS[normalizedRole]];
  }

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
      displayName:
        (userResult.data.user.user_metadata?.full_name as string | undefined) ??
        (userResult.data.user.user_metadata?.name as string | undefined) ??
        (userResult.data.user.user_metadata?.display_name as string | undefined) ??
        null,
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
