import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read"],
    resource: "producer.upp",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ upps: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const uppsResult = await supabaseAdmin
    .from("upps")
    .select("id,producer_id,upp_code,name,address_text,hectares_total,herd_limit,status,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (uppsResult.error) {
    return apiError("PRODUCER_UPP_QUERY_FAILED", uppsResult.error.message, 500);
  }

  return apiSuccess({ upps: uppsResult.data ?? [] });
}
