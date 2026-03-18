import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/modules/ranchos/infra/api/mvzRanchAccess";

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(request, uppId, "mvz.ranch.read", "mvz.ranch");
  if (!access.ok) {
    return access.response;
  }

  const overviewResult = await access.supabaseAdmin
    .from("v_mvz_ranch_overview")
    .select(
      "mvz_profile_id,assignment_id,upp_id,upp_name,upp_code,upp_status,producer_id,producer_name,address_text,location_lat,location_lng,sanitary_alert,total_animals,active_animals,animals_in_treatment,pending_vaccinations,incidents_registered,active_incidents,total_visits,last_visit_at,last_inspection_at"
    )
    .eq("mvz_profile_id", access.mvzProfileId)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (overviewResult.error) {
    return apiError("MVZ_RANCH_OVERVIEW_FAILED", overviewResult.error.message, 500);
  }

  if (!overviewResult.data) {
    return apiError("MVZ_RANCH_OVERVIEW_NOT_FOUND", "No existe contexto de rancho para la UPP enviada.", 404);
  }

  return apiSuccess({ overview: overviewResult.data });
}



