import { getSupabaseAdminClient } from "@/server/auth/supabase";

const MVZ_ASSIGNMENTS_SELECT =
  "assignment_id,upp_id,upp_name,upp_code,upp_status,location_lat,location_lng,herd_limit,producer_id,producer_name,active_animals,tb_last_date,tb_last_result,tb_valid_until,tb_status,br_last_date,br_last_result,br_valid_until,br_status,sanitary_alert,assigned_at";

const MVZ_ASSIGNMENTS_DASHBOARD_SELECT =
  "assignment_id,upp_id,upp_name,upp_code,producer_name,sanitary_alert,active_animals,assigned_at";

async function listMvzAssignmentsBySelect(mvzProfileId: string, select: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const assignmentsResult = await supabaseAdmin
    .from("v_mvz_assignments")
    .select(select)
    .eq("mvz_profile_id", mvzProfileId)
    .order("assigned_at", { ascending: false });

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  return assignmentsResult.data ?? [];
}

export async function listMvzAssignments(mvzProfileId: string) {
  return listMvzAssignmentsBySelect(mvzProfileId, MVZ_ASSIGNMENTS_SELECT);
}

export async function listMvzAssignmentSummaries(mvzProfileId: string) {
  return listMvzAssignmentsBySelect(mvzProfileId, MVZ_ASSIGNMENTS_DASHBOARD_SELECT);
}
