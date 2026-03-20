import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/modules/ranchos/infra/api/mvzRanchAccess";

function toBovinoRecord(
  row: {
    animal_id: string;
    upp_id: string;
    upp_name: string;
    upp_code: string | null;
    siniiga_tag: string;
    sex: "M" | "F";
    birth_date: string | null;
    animal_status: string;
    mother_animal_id: string | null;
    tb_date: string | null;
    tb_result: string | null;
    tb_valid_until: string | null;
    tb_status: string | null;
    br_date: string | null;
    br_result: string | null;
    br_valid_until: string | null;
    br_status: string | null;
    sanitary_alert: string | null;
  },
  uppStatus: string
) {
  return {
    id: row.animal_id,
    upp_id: row.upp_id,
    upp_name: row.upp_name,
    upp_code: row.upp_code,
    upp_status: uppStatus,
    siniiga_tag: row.siniiga_tag,
    sex: row.sex,
    birth_date: row.birth_date,
    status: row.animal_status,
    mother_animal_id: row.mother_animal_id,
    sanitary: {
      tb_date: row.tb_date,
      tb_result: row.tb_result,
      tb_valid_until: row.tb_valid_until,
      tb_status: row.tb_status,
      br_date: row.br_date,
      br_result: row.br_result,
      br_valid_until: row.br_valid_until,
      br_status: row.br_status,
      alert: row.sanitary_alert,
    },
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string; animalId: string }> }
) {
  const { uppId, animalId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.animals.read",
    "mvz.ranch.animals"
  );
  if (!access.ok) {
    return access.response;
  }

  const animalResult = await access.supabaseAdmin
    .from("v_animals_sanitary")
    .select(
      "animal_id,upp_id,upp_name,upp_code,siniiga_tag,sex,birth_date,animal_status,mother_animal_id,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
    )
    .eq("animal_id", animalId)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (animalResult.error) {
    return apiError("MVZ_RANCH_ANIMAL_DETAIL_FAILED", animalResult.error.message, 500);
  }

  if (!animalResult.data) {
    return apiError("MVZ_RANCH_ANIMAL_NOT_FOUND", "No existe animal para la UPP enviada.", 404);
  }

  const [uppResult, fieldTestsResult, incidentsResult, vaccinationsResult, exportsResult, offspringResult] =
    await Promise.all([
      access.supabaseAdmin.from("upps").select("status").eq("id", uppId).maybeSingle(),
      access.supabaseAdmin
        .from("field_tests")
        .select(
          "id,animal_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at,test_types(key,name),mvz_profiles(full_name)"
        )
        .eq("animal_id", animalId)
        .eq("upp_id", uppId)
        .order("sample_date", { ascending: false }),
      access.supabaseAdmin
        .from("sanitary_incidents")
        .select(
          "id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,created_at,mvz_profiles(full_name)"
        )
        .eq("animal_id", animalId)
        .eq("upp_id", uppId)
        .order("detected_at", { ascending: false }),
      access.supabaseAdmin
        .from("animal_vaccinations")
        .select(
          "id,animal_id,vaccine_name,dose,status,applied_at,due_at,notes,created_at,mvz_profiles(full_name)"
        )
        .eq("animal_id", animalId)
        .eq("upp_id", uppId)
        .order("created_at", { ascending: false }),
      access.supabaseAdmin
        .from("export_requests")
        .select(
          "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,blocked_reason,created_at,updated_at"
        )
        .eq("upp_id", uppId)
        .order("created_at", { ascending: false })
        .limit(20),
      access.supabaseAdmin
        .from("v_animals_sanitary")
        .select(
          "animal_id,upp_id,upp_name,upp_code,siniiga_tag,sex,birth_date,animal_status,mother_animal_id,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
        )
        .eq("mother_animal_id", animalId)
        .eq("upp_id", uppId)
        .order("birth_date", { ascending: false }),
    ]);

  if (uppResult.error || !uppResult.data) {
    return apiError("MVZ_RANCH_UPP_STATUS_FAILED", uppResult.error?.message ?? "No fue posible resolver estado UPP.", 500);
  }

  const uppStatus = uppResult.data.status;
  if (fieldTestsResult.error || incidentsResult.error || vaccinationsResult.error || exportsResult.error || offspringResult.error) {
    return apiError(
      "MVZ_RANCH_ANIMAL_RELATED_DATA_FAILED",
      fieldTestsResult.error?.message ??
        incidentsResult.error?.message ??
        vaccinationsResult.error?.message ??
        exportsResult.error?.message ??
        offspringResult.error?.message ??
        "No fue posible cargar el detalle del bovino.",
      500
    );
  }

  return apiSuccess({
    bovino: toBovinoRecord(animalResult.data, uppStatus),
    fieldTests: (fieldTestsResult.data ?? []).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      test_type_key: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.key ?? "-",
      test_type_name: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.name ?? "-",
      sample_date: row.sample_date,
      result: row.result,
      valid_until: row.valid_until,
      mvz_name:
        (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
      captured_lat: row.captured_lat,
      captured_lng: row.captured_lng,
      created_at: row.created_at,
    })),
    incidents: (incidentsResult.data ?? []).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      incident_type: row.incident_type,
      severity: row.severity,
      status: row.status,
      detected_at: row.detected_at,
      resolved_at: row.resolved_at,
      description: row.description,
      resolution_notes: row.resolution_notes,
      mvz_name:
        (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
      created_at: row.created_at,
    })),
    vaccinations: (vaccinationsResult.data ?? []).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      vaccine_name: row.vaccine_name,
      dose: row.dose,
      status: row.status,
      applied_at: row.applied_at,
      due_at: row.due_at,
      mvz_name:
        (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
      notes: row.notes,
      created_at: row.created_at,
    })),
    exports: exportsResult.data ?? [],
    offspring: (offspringResult.data ?? []).map((row) => toBovinoRecord(row, uppStatus)),
  });
}
