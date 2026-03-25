import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/modules/ranchos/infra/api/mvzRanchAccess";

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.animals.read",
    "mvz.ranch.animals"
  );
  if (!access.ok) {
    return access.response;
  }

  const animalsResult = await access.supabaseAdmin
    .from("v_animals_sanitary")
    .select(
      "animal_id,upp_id,tenant_id,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,mother_animal_id,current_collar_uuid,current_collar_id,current_collar_status,current_collar_linked_at,upp_name,upp_code,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
    )
    .eq("upp_id", uppId)
    .order("siniiga_tag", { ascending: true });

  if (animalsResult.error) {
    return apiError("MVZ_RANCH_ANIMALS_FAILED", animalsResult.error.message, 500);
  }

  return apiSuccess({ animals: animalsResult.data ?? [] });
}



