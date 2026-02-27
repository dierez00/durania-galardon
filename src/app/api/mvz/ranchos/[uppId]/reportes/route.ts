import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/app/api/mvz/ranchos/_utils";

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.reports.read",
    "mvz.ranch.reports"
  );
  if (!access.ok) {
    return access.response;
  }

  const reportResult = await access.supabase
    .from("v_mvz_ranch_reports")
    .select(
      "mvz_profile_id,upp_id,upp_name,exports_requested,exports_validated,exports_blocked,movements_requested,movements_approved,tests_total_90d,positive_tests_90d,incidents_open,incidents_resolved_30d"
    )
    .eq("mvz_profile_id", access.mvzProfileId)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (reportResult.error) {
    return apiError("MVZ_RANCH_REPORTS_FAILED", reportResult.error.message, 500);
  }

  if (!reportResult.data) {
    return apiError("MVZ_RANCH_REPORTS_NOT_FOUND", "No existe reporte para la UPP enviada.", 404);
  }

  return apiSuccess({ report: reportResult.data });
}


