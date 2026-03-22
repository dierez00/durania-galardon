import { apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, { resource: "auth.me" });
  if (!auth.ok) {
    return auth.response;
  }

  const { user, permissions } = auth.context;
  const provisioning = getSupabaseProvisioningClient();
  const tenantResult = await provisioning
    .from("tenants")
    .select("id,slug,type,name")
    .eq("id", user.tenantId)
    .maybeSingle();

  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      roleKey: user.roleKey,
      roleName: user.roleName,
      isSystemRole: user.isSystemRole,
      isMvzInternal: user.isMvzInternal,
      displayName: user.displayName,
    },
    tenant: {
      id: tenantResult.data?.id ?? user.tenantId,
      slug: tenantResult.data?.slug ?? user.tenantSlug,
      type: tenantResult.data?.type ?? user.tenantType,
      name: tenantResult.data?.name ?? user.tenantSlug,
    },
    panelType: user.panelType,
    permissions,
  });
}
