import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import type { PermissionKey } from "@/shared/lib/auth";

export async function hasTenantPermission(
  accessToken: string,
  tenantId: string,
  permissionKey: PermissionKey
): Promise<boolean> {
  const supabase = createSupabaseRlsServerClient(accessToken);
  const result = await supabase.rpc("auth_has_tenant_permission", {
    p_tenant_id: tenantId,
    p_permission_key: permissionKey,
  });

  return !result.error && result.data === true;
}

export async function requirePermission(
  accessToken: string,
  tenantId: string,
  permissionKey: PermissionKey
): Promise<boolean> {
  return hasTenantPermission(accessToken, tenantId, permissionKey);
}
