import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read"],
    resource: "producer.upp",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { uppId } = await params;

  // Validate that the requested UPP is accessible to this user
  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (!accessibleUppIds.includes(uppId)) {
    return apiError("UPP_NOT_FOUND", "Rancho no encontrado.", 404);
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const { data, error } = await supabase
    .from("upps")
    .select(
      "id,producer_id,upp_code,name,address_text,location_lat,location_lng,hectares_total,herd_limit,status,created_at"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", uppId)
    .single();

  if (error || !data) {
    return apiError("UPP_NOT_FOUND", "Rancho no encontrado.", 404);
  }

  return apiSuccess({ upp: data });
}
