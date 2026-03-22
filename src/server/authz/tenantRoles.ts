import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { isPermissionKey, type PermissionKey } from "@/shared/lib/auth";

export type TenantRolePanel = "producer" | "mvz";

export interface TenantRolePermissionCatalogItem {
  id: string;
  key: PermissionKey;
  description: string;
  groupKey: string;
  groupLabel: string;
  action: string;
}

export interface TenantRoleSummary {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  priority: number;
  memberCount: number;
  permissions: PermissionKey[];
  isBase: boolean;
  isEditable: boolean;
  isCloneable: boolean;
}

interface TenantRoleRow {
  id: string;
  key: string;
  name: string;
  is_system: boolean;
  priority: number;
}

const PANEL_SYSTEM_ROLE_KEYS: Record<TenantRolePanel, string[]> = {
  producer: ["producer", "employee", "producer_viewer"],
  mvz: ["mvz_government", "mvz_internal"],
};

export function getVisibleSystemRoleKeys(panel: TenantRolePanel) {
  return PANEL_SYSTEM_ROLE_KEYS[panel];
}

export function getDefaultRoleKeyForPanel(panel: TenantRolePanel) {
  return panel === "producer" ? "employee" : "mvz_internal";
}

export function isVisibleRoleForPanel(
  panel: TenantRolePanel,
  role: { key: string; is_system: boolean }
) {
  if (!role.is_system) {
    return true;
  }

  return PANEL_SYSTEM_ROLE_KEYS[panel].includes(role.key);
}

function buildPermissionGroupLabel(groupKey: string) {
  const label = groupKey.replace(/\./g, " / ").replace(/-/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCustomRoleSlug(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);

  return normalized || "rol";
}

async function resolvePermissionCatalog(panel: TenantRolePanel) {
  const supabaseAdmin = getSupabaseAdminClient();
  const permissionsResult = await supabaseAdmin
    .from("permissions")
    .select("id,key,description,module")
    .eq("module", panel)
    .order("key", { ascending: true });

  if (permissionsResult.error) {
    throw new Error(permissionsResult.error.message);
  }

  return (permissionsResult.data ?? [])
    .filter(
      (permission): permission is { id: string; key: PermissionKey; description: string | null; module: string | null } =>
        isPermissionKey(permission.key) && permission.key.startsWith(`${panel}.`)
    )
    .map((permission) => {
      const parts = permission.key.split(".");
      const action = parts.at(-1) ?? "read";
      const groupKey = parts.slice(1, -1).join(".") || "general";

      return {
        id: permission.id,
        key: permission.key,
        description: permission.description ?? permission.key,
        groupKey,
        groupLabel: buildPermissionGroupLabel(groupKey),
        action,
      };
    });
}

export async function listPermissionCatalogForPanel(
  panel: TenantRolePanel
): Promise<TenantRolePermissionCatalogItem[]> {
  return resolvePermissionCatalog(panel);
}

async function resolveVisibleRolesForTenant(tenantId: string, panel: TenantRolePanel) {
  const supabaseAdmin = getSupabaseAdminClient();
  const rolesResult = await supabaseAdmin
    .from("tenant_roles")
    .select("id,key,name,is_system,priority")
    .eq("tenant_id", tenantId)
    .order("priority", { ascending: true })
    .order("name", { ascending: true });

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  return ((rolesResult.data ?? []) as TenantRoleRow[]).filter((role) =>
    isVisibleRoleForPanel(panel, role)
  );
}

export async function listTenantRolesForPanel(
  tenantId: string,
  panel: TenantRolePanel
): Promise<{
  roles: TenantRoleSummary[];
  permissionCatalog: TenantRolePermissionCatalogItem[];
}> {
  const supabaseAdmin = getSupabaseAdminClient();
  const [roles, permissionCatalog] = await Promise.all([
    resolveVisibleRolesForTenant(tenantId, panel),
    resolvePermissionCatalog(panel),
  ]);

  if (roles.length === 0) {
    return { roles: [], permissionCatalog };
  }

  const roleIds = roles.map((role) => role.id);
  const [rolePermissionsResult, assignmentsResult, membershipsResult] = await Promise.all([
    supabaseAdmin
      .from("tenant_role_permissions")
      .select("tenant_role_id,permission:permissions(key)")
      .in("tenant_role_id", roleIds),
    supabaseAdmin
      .from("tenant_user_roles")
      .select("tenant_role_id,membership_id")
      .in("tenant_role_id", roleIds),
    supabaseAdmin
      .from("tenant_memberships")
      .select("id,status")
      .eq("tenant_id", tenantId),
  ]);

  if (rolePermissionsResult.error) {
    throw new Error(rolePermissionsResult.error.message);
  }

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  const activeMembershipIds = new Set(
    (membershipsResult.data ?? [])
      .filter((membership) => membership.status === "active")
      .map((membership) => membership.id)
  );

  const permissionsByRoleId = new Map<string, PermissionKey[]>();
  (rolePermissionsResult.data ?? []).forEach((row) => {
    const current = permissionsByRoleId.get(row.tenant_role_id) ?? [];
    const permission = Array.isArray(row.permission) ? row.permission[0] : row.permission;

    if (permission?.key && isPermissionKey(permission.key)) {
      current.push(permission.key);
      permissionsByRoleId.set(row.tenant_role_id, current);
    }
  });

  const membersByRoleId = new Map<string, Set<string>>();
  (assignmentsResult.data ?? []).forEach((row) => {
    if (!activeMembershipIds.has(row.membership_id)) {
      return;
    }

    const current = membersByRoleId.get(row.tenant_role_id) ?? new Set<string>();
    current.add(row.membership_id);
    membersByRoleId.set(row.tenant_role_id, current);
  });

  return {
    roles: roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.is_system,
      priority: role.priority,
      memberCount: membersByRoleId.get(role.id)?.size ?? 0,
      permissions: [...new Set(permissionsByRoleId.get(role.id) ?? [])].sort(),
      isBase: role.is_system,
      isEditable: !role.is_system,
      isCloneable: true,
    })),
    permissionCatalog,
  };
}

export async function resolveAssignableRoleForPanel(input: {
  tenantId: string;
  panel: TenantRolePanel;
  roleId?: string | null;
  fallbackRoleKey?: string;
}) {
  const roles = await resolveVisibleRolesForTenant(input.tenantId, input.panel);
  const fallbackRoleKey = input.fallbackRoleKey ?? getDefaultRoleKeyForPanel(input.panel);

  if (input.roleId) {
    const selectedRole = roles.find((role) => role.id === input.roleId);
    if (!selectedRole) {
      throw new Error("ROLE_NOT_ASSIGNABLE");
    }

    return selectedRole;
  }

  const fallbackRole = roles.find((role) => role.key === fallbackRoleKey);
  if (!fallbackRole) {
    throw new Error("ROLE_NOT_ASSIGNABLE");
  }

  return fallbackRole;
}

export async function createCustomRoleForPanel(input: {
  tenantId: string;
  panel: TenantRolePanel;
  name: string;
  permissionKeys?: string[];
  cloneFromRoleId?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const permissionCatalog = await resolvePermissionCatalog(input.panel);
  const permissionByKey = new Map(permissionCatalog.map((permission) => [permission.key, permission]));
  const normalizedPermissionKeys = Array.from(
    new Set((input.permissionKeys ?? []).filter((permissionKey) => permissionByKey.has(permissionKey as PermissionKey)))
  ) as PermissionKey[];

  let selectedPermissionKeys = normalizedPermissionKeys;

  if (input.cloneFromRoleId) {
    const sourceRoleResult = await supabaseAdmin
      .from("tenant_roles")
      .select("id,key,is_system")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.cloneFromRoleId)
      .maybeSingle();

    if (sourceRoleResult.error || !sourceRoleResult.data) {
      throw new Error("ROLE_CLONE_SOURCE_NOT_FOUND");
    }

    if (!isVisibleRoleForPanel(input.panel, sourceRoleResult.data)) {
      throw new Error("ROLE_CLONE_SOURCE_NOT_FOUND");
    }

    const sourcePermissionsResult = await supabaseAdmin
      .from("tenant_role_permissions")
      .select("permission:permissions(key)")
      .eq("tenant_role_id", input.cloneFromRoleId);

    if (sourcePermissionsResult.error) {
      throw new Error(sourcePermissionsResult.error.message);
    }

    selectedPermissionKeys = (sourcePermissionsResult.data ?? [])
      .map((row) => {
        const permission = Array.isArray(row.permission) ? row.permission[0] : row.permission;
        return permission?.key ?? null;
      })
      .filter(
        (permissionKey): permissionKey is PermissionKey =>
          permissionKey !== null && permissionByKey.has(permissionKey)
      );
  }

  const existingKeysResult = await supabaseAdmin
    .from("tenant_roles")
    .select("key,priority")
    .eq("tenant_id", input.tenantId);

  if (existingKeysResult.error) {
    throw new Error(existingKeysResult.error.message);
  }

  const roleKeyBase = `custom_${buildCustomRoleSlug(input.name)}`;
  const existingKeys = new Set((existingKeysResult.data ?? []).map((role) => role.key));
  let roleKey = roleKeyBase;
  let suffix = 2;
  while (existingKeys.has(roleKey)) {
    roleKey = `${roleKeyBase}_${suffix}`;
    suffix += 1;
  }

  const nextPriority =
    Math.max(100, ...(existingKeysResult.data ?? []).map((role) => role.priority ?? 100)) + 10;

  const createdRoleResult = await supabaseAdmin
    .from("tenant_roles")
    .insert({
      tenant_id: input.tenantId,
      key: roleKey,
      name: input.name,
      is_system: false,
      priority: nextPriority,
    })
    .select("id,key,name,is_system,priority")
    .single();

  if (createdRoleResult.error || !createdRoleResult.data) {
    throw new Error(createdRoleResult.error?.message ?? "ROLE_CREATE_FAILED");
  }

  if (selectedPermissionKeys.length > 0) {
    const permissionLinks = selectedPermissionKeys
      .map((permissionKey) => permissionByKey.get(permissionKey))
      .filter((permission): permission is TenantRolePermissionCatalogItem => Boolean(permission))
      .map((permission) => ({
        tenant_role_id: createdRoleResult.data.id,
        permission_id: permission.id,
      }));

    if (permissionLinks.length > 0) {
      const permissionInsertResult = await supabaseAdmin
        .from("tenant_role_permissions")
        .insert(permissionLinks);

      if (permissionInsertResult.error) {
        throw new Error(permissionInsertResult.error.message);
      }
    }
  }

  return {
    id: createdRoleResult.data.id,
    key: createdRoleResult.data.key,
    name: createdRoleResult.data.name,
    permissions: selectedPermissionKeys,
  };
}

export async function updateCustomRoleForPanel(input: {
  tenantId: string;
  panel: TenantRolePanel;
  roleId: string;
  name?: string;
  permissionKeys?: string[];
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const roleResult = await supabaseAdmin
    .from("tenant_roles")
    .select("id,key,name,is_system")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.roleId)
    .maybeSingle();

  if (roleResult.error || !roleResult.data || !isVisibleRoleForPanel(input.panel, roleResult.data)) {
    throw new Error("ROLE_NOT_FOUND");
  }

  if (roleResult.data.is_system) {
    throw new Error("ROLE_SYSTEM_EDIT_FORBIDDEN");
  }

  const permissionCatalog = await resolvePermissionCatalog(input.panel);
  const permissionByKey = new Map(permissionCatalog.map((permission) => [permission.key, permission]));
  const nextPermissionKeys =
    input.permissionKeys === undefined
      ? undefined
      : (Array.from(
          new Set(
            input.permissionKeys.filter((permissionKey) => permissionByKey.has(permissionKey as PermissionKey))
          )
        ) as PermissionKey[]);

  if (input.name?.trim()) {
    const updateResult = await supabaseAdmin
      .from("tenant_roles")
      .update({ name: input.name.trim() })
      .eq("id", input.roleId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  if (nextPermissionKeys) {
    const clearPermissionsResult = await supabaseAdmin
      .from("tenant_role_permissions")
      .delete()
      .eq("tenant_role_id", input.roleId);

    if (clearPermissionsResult.error) {
      throw new Error(clearPermissionsResult.error.message);
    }

    if (nextPermissionKeys.length > 0) {
      const insertPermissionsResult = await supabaseAdmin
        .from("tenant_role_permissions")
        .insert(
          nextPermissionKeys
            .map((permissionKey) => permissionByKey.get(permissionKey))
            .filter((permission): permission is TenantRolePermissionCatalogItem => Boolean(permission))
            .map((permission) => ({
              tenant_role_id: input.roleId,
              permission_id: permission.id,
            }))
        );

      if (insertPermissionsResult.error) {
        throw new Error(insertPermissionsResult.error.message);
      }
    }
  }

  return {
    id: input.roleId,
    key: roleResult.data.key,
    name: input.name?.trim() || roleResult.data.name,
    permissions: nextPermissionKeys,
  };
}
