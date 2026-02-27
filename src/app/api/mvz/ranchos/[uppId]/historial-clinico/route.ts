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
    "mvz.ranch.clinical.read",
    "mvz.ranch.clinical"
  );
  if (!access.ok) {
    return access.response;
  }

  const testsResult = await access.supabase
    .from("field_tests")
    .select(
      "id,animal_id,upp_id,test_type_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at"
    )
    .eq("upp_id", uppId)
    .order("sample_date", { ascending: false });

  if (testsResult.error) {
    return apiError("MVZ_RANCH_CLINICAL_FAILED", testsResult.error.message, 500);
  }

  return apiSuccess({ tests: testsResult.data ?? [] });
}


