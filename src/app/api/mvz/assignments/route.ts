import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveMvzProfileId } from "@/server/authz/profiles";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.assignments.read"],
    resource: "mvz.assignments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const user = auth.context.user;
  const tenantId = user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();

  const mvzProfileId = await resolveMvzProfileId(user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  let query = supabaseAdmin
    .from("mvz_upp_assignments")
    .select("id,upp_id,status,assigned_at,unassigned_at")
    .eq("tenant_id", tenantId)
    .order("assigned_at", { ascending: false });

  query = query.eq("mvz_profile_id", mvzProfileId);

  const assignmentsResult = await query;
  if (assignmentsResult.error) {
    return apiError("MVZ_ASSIGNMENTS_QUERY_FAILED", assignmentsResult.error.message, 500);
  }

  const assignments = assignmentsResult.data ?? [];
  const uppIds = assignments.map((row) => row.upp_id);

  let uppById = new Map<string, { name: string; address_text: string | null }>();
  if (uppIds.length > 0) {
    const uppsResult = await supabaseAdmin
      .from("upps")
      .select("id,name,address_text")
      .eq("tenant_id", tenantId)
      .in("id", uppIds);

    if (!uppsResult.error) {
      uppById = new Map((uppsResult.data ?? []).map((upp) => [upp.id, { name: upp.name, address_text: upp.address_text }]));
    }
  }

  return apiSuccess({
    assignments: assignments.map((item) => ({
      ...item,
      upp: uppById.get(item.upp_id) ?? null,
    })),
  });
}
