import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
import type { AuthenticatedRequestUser } from "@/server/auth";
import { isProducerViewRole } from "@/shared/lib/auth";
import {
  isProducerAccessDebugEnabled,
  logProducerAccessServer,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

export async function resolveMvzProfileId(user: AuthenticatedRequestUser): Promise<string | null> {
  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const result = await supabase
    .from("mvz_profiles")
    .select("id")
    .eq("owner_tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!result.error && result.data?.id) {
    return result.data.id;
  }

  // Fallback defensivo: algunos entornos pueden tener RLS/policies parciales
  // y bloquear el SELECT para el propio MVZ. El contexto auth ya validó rol+tenant.
  const supabaseAdmin = getSupabaseAdminClient();
  const adminResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("id")
    .eq("owner_tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (adminResult.error || !adminResult.data?.id) {
    return null;
  }

  return adminResult.data.id;
}

export async function resolveProducerId(user: AuthenticatedRequestUser): Promise<string | null> {
  const debugProducerAccess = isProducerAccessDebugEnabled() && isProducerViewRole(user.role);
  const debugContext = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    panelType: user.panelType,
  };

  if (debugProducerAccess) {
    logProducerAccessServer("resolveProducerId:start", debugContext);
  }

  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const result = await supabase
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (debugProducerAccess) {
    logProducerAccessServer("resolveProducerId:rls-query", {
      ...debugContext,
      found: Boolean(result.data?.id),
      producerId: result.data?.id ?? null,
      error: summarizeProducerAccessError(result.error),
    });
  }

  if (result.error || !result.data) {
    if (debugProducerAccess) {
      const supabaseAdmin = getSupabaseAdminClient();
      const adminByUserResult = await supabaseAdmin
        .from("producers")
        .select("id,user_id,status")
        .eq("owner_tenant_id", user.tenantId)
        .eq("user_id", user.id)
        .maybeSingle();
      const adminByTenantResult = await supabaseAdmin
        .from("producers")
        .select("id,user_id,status")
        .eq("owner_tenant_id", user.tenantId)
        .limit(5);

      logProducerAccessServer("resolveProducerId:admin-diagnostic", {
        ...debugContext,
        adminByUserFound: Boolean(adminByUserResult.data?.id),
        adminByUserProducerId: adminByUserResult.data?.id ?? null,
        adminByUserError: summarizeProducerAccessError(adminByUserResult.error),
        tenantProducerCount: (adminByTenantResult.data ?? []).length,
        tenantProducerError: summarizeProducerAccessError(adminByTenantResult.error),
        tenantProducers:
          (adminByTenantResult.data ?? []).slice(0, 5).map((producer) => ({
            id: producer.id,
            userId: producer.user_id,
            status: producer.status,
          })),
      });
    }

    return null;
  }

  if (debugProducerAccess) {
    logProducerAccessServer("resolveProducerId:resolved", {
      ...debugContext,
      producerId: result.data.id,
    });
  }

  return result.data.id;
}
