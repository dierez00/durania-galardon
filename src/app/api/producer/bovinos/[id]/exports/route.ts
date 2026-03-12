import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdminClient();

  // Get the animal's UPP to query exports by UPP
  const animalCheck = await supabaseAdmin
    .from("animals")
    .select("id,upp_id,tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (animalCheck.error || !animalCheck.data) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }

  const animal = animalCheck.data as { id: string; upp_id: string; tenant_id: string };

  const canAccess = await auth.context.canAccessUpp(animal.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  // Export requests are per-UPP, not per-animal
  const result = await supabaseAdmin
    .from("export_requests")
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,blocked_reason,created_at,updated_at"
    )
    .eq("upp_id", animal.upp_id)
    .eq("tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (result.error) {
    return apiError("EXPORTS_QUERY_FAILED", result.error.message, 500);
  }

  return apiSuccess({ exports: result.data ?? [] });
}
