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
  const supabaseAdmin = getSupabaseAdminClient();

  const mvzProfileId = await resolveMvzProfileId(user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  const assignmentsResult = await supabaseAdmin
    .from("v_mvz_assignments")
    .select(
      "assignment_id,upp_id,upp_name,upp_code,upp_status,location_lat,location_lng,herd_limit,producer_id,producer_name,active_animals,tb_last_date,tb_last_result,tb_valid_until,tb_status,br_last_date,br_last_result,br_valid_until,br_status,sanitary_alert,assigned_at"
    )
    .eq("mvz_profile_id", mvzProfileId)
    .order("assigned_at", { ascending: false });

  if (assignmentsResult.error) {
    return apiError("MVZ_ASSIGNMENTS_QUERY_FAILED", assignmentsResult.error.message, 500);
  }

  return apiSuccess({
    assignments: assignmentsResult.data ?? [],
  });
}
