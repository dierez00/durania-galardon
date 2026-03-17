import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
import type { AuthenticatedRequestUser } from "@/server/auth";

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
  const supabase = createSupabaseRlsServerClient(user.accessToken);
  const result = await supabase
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", user.tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  return result.data.id;
}
