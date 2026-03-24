import { resolveTenant } from "@/server/tenants/resolveTenant";
import {
  deriveCompatibleRole,
  isPermissionKey,
  isTenantAdminRole,
  redirectPathForRole,
  resolveDefaultPermissionsForTenantRole,
  type AppRole,
  type PermissionKey,
  type TenantPanelType,
} from "@/shared/lib/auth";
import {
  createSupabaseRlsServerClient,
  getSupabaseProvisioningClient,
} from "@/server/auth/supabase";

type TenantType = TenantPanelType;

interface UserContextRow {
  user_id: string;
  tenant_id: string;
  tenant_type: TenantType;
  tenant_slug: string;
  role_key: string;
  role_name: string | null;
  is_system_role: boolean;
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

interface RoleRow {
  key?: string;
  name?: string;
  priority?: number;
  is_system?: boolean;
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
  roleKey: string;
  roleName: string;
  isSystemRole: boolean;
  isMvzInternal: boolean;
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

function resolveDefaultRoleKeyForTenantType(type: TenantType): string {
  if (type === "government") {
    return "tenant_admin";
  }

  if (type === "mvz") {
    return "mvz_government";
  }

  return "producer";
}

function resolvePanelTypeForContext(row: Pick<UserContextRow, "tenant_type" | "role_key">): TenantType {
  if (row.tenant_type === "producer" && row.role_key === "mvz_internal") {
    return "mvz";
  }

  return row.tenant_type;
}

function resolveDefaultRoleNameForTenantType(type: TenantType): string {
  if (type === "government") {
    return "Administrador";
  }

  if (type === "mvz") {
    return "MVZ Gobierno";
  }

  return "Productor";
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
    .select("tenant_roles(key,name,priority,is_system)")
    .eq("membership_id", selectedMembership.id);

  let selectedRoleKey: string | null = null;
  let selectedRoleName: string | null = null;
  let selectedRoleIsSystem = false;
  let selectedPriority = 100;
  let usedDefaultRole = false;

  if (!roleResult.error && roleResult.data) {
    const roleRows = roleResult.data as Array<{
      tenant_roles?: RoleRow | RoleRow[];
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
        key: role.key?.trim() ?? null,
        name: role.name?.trim() ?? null,
        priority: role.priority ?? 100,
        isSystem: role.is_system === true,
      }))
      .filter((item): item is { key: string; name: string | null; priority: number; isSystem: boolean } => item.key !== null)
      .sort((a, b) => a.priority - b.priority);

    if (flattened.length > 0) {
      selectedRoleKey = flattened[0].key;
      selectedRoleName = flattened[0].name;
      selectedPriority = flattened[0].priority;
      selectedRoleIsSystem = flattened[0].isSystem;
    }
  }

  if (!selectedRoleKey) {
    selectedRoleKey = resolveDefaultRoleKeyForTenantType(selectedTenant.type);
    selectedRoleName = resolveDefaultRoleNameForTenantType(selectedTenant.type);
    selectedPriority = 1;
    selectedRoleIsSystem = true;
    usedDefaultRole = true;
  }

  return {
    row: {
      user_id: userId,
      tenant_id: selectedTenant.id,
      tenant_type: selectedTenant.type,
      tenant_slug: selectedTenant.slug,
      role_key: selectedRoleKey,
      role_name: selectedRoleName,
      is_system_role: selectedRoleIsSystem,
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

async function resolveRoleSystemFlag(
  tenantId: string,
  roleKey: string
): Promise<boolean> {
  const provisioning = getSupabaseProvisioningClient();
  const roleResult = await provisioning
    .from("tenant_roles")
    .select("is_system")
    .eq("tenant_id", tenantId)
    .eq("key", roleKey)
    .maybeSingle();

  if (roleResult.error || !roleResult.data) {
    return false;
  }

  return roleResult.data.is_system === true;
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
    .select("user_id,tenant_id,tenant_type,tenant_slug,role_key,role_name,role_priority")
    .order("role_priority", { ascending: true })
    .limit(1);

  if (preferredTenantSlug) {
    contextQuery = contextQuery.eq("tenant_slug", preferredTenantSlug);
  }

  let contextResult = await contextQuery.maybeSingle();

  if ((contextResult.error || !contextResult.data) && preferredTenantSlug) {
    contextResult = await supabase
      .from("v_user_context")
      .select("user_id,tenant_id,tenant_type,tenant_slug,role_key,role_name,role_priority")
      .order("role_priority", { ascending: true })
      .limit(1)
      .maybeSingle();
  }

  let row: UserContextRow | null = contextResult.data as UserContextRow | null;
  let usedDefaultRole = false;

  if (!row) {
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

  if (!row.role_name) {
    row.role_name = row.role_key;
  }

  row.is_system_role = await resolveRoleSystemFlag(row.tenant_id, row.role_key);

  const compatibleRole = deriveCompatibleRole(row.tenant_type, row.role_key);

  const permissionsResult = await supabase
    .from("v_user_permissions")
    .select("permission_key")
    .eq("tenant_id", row.tenant_id);

  let permissions = (permissionsResult.data ?? [])
    .map((item) => (item as PermissionRow).permission_key)
    .filter(isPermissionKey);

  if (permissions.length === 0 && usedDefaultRole) {
    permissions = [...resolveDefaultPermissionsForTenantRole(row.tenant_type, row.role_key)];
  }

  return {
    row,
    permissions,
    panelType: resolvePanelTypeForContext(row),
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
      role: deriveCompatibleRole(contextResult.row.tenant_type, contextResult.row.role_key),
      roleKey: contextResult.row.role_key,
      roleName: contextResult.row.role_name ?? contextResult.row.role_key,
      isSystemRole: contextResult.row.is_system_role,
      isMvzInternal: contextResult.row.role_key === "mvz_internal",
      tenantId: contextResult.row.tenant_id,
      tenantSlug: contextResult.row.tenant_slug,
      tenantType: contextResult.row.tenant_type,
      panelType: contextResult.panelType,
      permissions: contextResult.permissions,
      accessToken,
    },
  };
}
