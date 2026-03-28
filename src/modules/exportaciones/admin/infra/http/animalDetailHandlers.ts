import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient, getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; animalId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.read"],
    resource: "admin.exports",
  });
  if (!auth.ok) return auth.response;

  const { id, animalId } = await params;
  const tenantId = auth.context.user.tenantId;
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  const exportResult = await supabase
    .from("export_requests")
    .select("metrics_json")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (exportResult.error) {
    return apiError("ADMIN_EXPORT_QUERY_FAILED", exportResult.error.message, 500);
  }
  if (!exportResult.data) {
    return apiError("ADMIN_EXPORT_NOT_FOUND", "No existe la solicitud de exportacion.", 404);
  }

  const metrics = exportResult.data.metrics_json as { animal_ids?: string[] } | null;
  const animalIds = metrics?.animal_ids ?? [];
  if (!animalIds.includes(animalId)) {
    return apiError("ANIMAL_NOT_IN_EXPORT", "El animal no pertenece a esta exportacion.", 404);
  }

  const adminClient = getSupabaseProvisioningClient();

  const animalResult = await adminClient
    .from("v_animals_sanitary")
    .select(
      "animal_id,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,mother_animal_id,current_collar_id,current_collar_status,current_collar_linked_at,sanitary_alert,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,upp_id,upp_name,upp_code"
    )
    .eq("animal_id", animalId)
    .maybeSingle();

  if (animalResult.error) {
    return apiError("ADMIN_ANIMAL_QUERY_FAILED", animalResult.error.message, 500);
  }
  if (!animalResult.data) {
    return apiError("ADMIN_ANIMAL_NOT_FOUND", "No existe el animal.", 404);
  }

  const [testsResult, vaccinationsResult, incidentsResult] = await Promise.all([
    adminClient
      .from("field_tests")
      .select(
        "id,sample_date,result,valid_until,created_at,test_types(key,name),mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .order("sample_date", { ascending: false }),
    adminClient
      .from("animal_vaccinations")
      .select(
        "id,vaccine_name,dose,status,applied_at,due_at,notes,created_at,mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("sanitary_incidents")
      .select(
        "id,incident_type,severity,status,detected_at,resolved_at,description,created_at,mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .order("detected_at", { ascending: false }),
  ]);

  if (testsResult.error || vaccinationsResult.error || incidentsResult.error) {
    return apiError(
      "ADMIN_ANIMAL_RELATED_DATA_FAILED",
      testsResult.error?.message ??
        vaccinationsResult.error?.message ??
        incidentsResult.error?.message ??
        "No fue posible cargar el detalle del animal.",
      500
    );
  }

  const animalData = animalResult.data;
  const tests = (testsResult.data ?? []).map((test) => {
    const testType = Array.isArray(test.test_types) ? test.test_types[0] : test.test_types;
    const mvz = Array.isArray(test.mvz_profiles) ? test.mvz_profiles[0] : test.mvz_profiles;
    return {
      id: test.id,
      testTypeKey: (testType?.key ?? "unknown") as "tb" | "br",
      testTypeName: testType?.name ?? null,
      sampleDate: test.sample_date,
      result: test.result,
      validUntil: test.valid_until ?? null,
      mvzFullName: mvz?.full_name ?? null,
    };
  });

  const vaccinations = (vaccinationsResult.data ?? []).map((vaccination) => {
    const mvz = Array.isArray(vaccination.mvz_profiles)
      ? vaccination.mvz_profiles[0]
      : vaccination.mvz_profiles;
    return {
      id: vaccination.id,
      vaccineName: vaccination.vaccine_name,
      dose: vaccination.dose ?? null,
      status: vaccination.status,
      appliedAt: vaccination.applied_at ?? null,
      dueAt: vaccination.due_at ?? null,
      mvzFullName: mvz?.full_name ?? null,
      notes: vaccination.notes ?? null,
    };
  });

  const incidents = (incidentsResult.data ?? []).map((incident) => {
    const mvz = Array.isArray(incident.mvz_profiles) ? incident.mvz_profiles[0] : incident.mvz_profiles;
    return {
      id: incident.id,
      incidentType: incident.incident_type,
      severity: incident.severity,
      status: incident.status,
      detectedAt: incident.detected_at,
      resolvedAt: incident.resolved_at ?? null,
      mvzFullName: mvz?.full_name ?? null,
      description: incident.description ?? null,
    };
  });

  const animal = {
    id: animalData.animal_id,
    siniigaTag: animalData.siniiga_tag,
    name: animalData.name ?? null,
    sex: animalData.sex,
    birthDate: animalData.birth_date ?? null,
    breed: animalData.breed ?? null,
    weightKg: animalData.weight_kg ?? null,
    ageYears: animalData.age_years ?? null,
    healthStatus: animalData.health_status ?? null,
    lastVaccineAt: animalData.last_vaccine_at ?? null,
    status: animalData.animal_status,
    currentCollarId: animalData.current_collar_id ?? null,
    currentCollarStatus: animalData.current_collar_status ?? null,
    currentCollarLinkedAt: animalData.current_collar_linked_at ?? null,
    sanitaryAlert: animalData.sanitary_alert ?? "sin_pruebas",
    tbLastDate: animalData.tb_date ?? null,
    tbResult: animalData.tb_result ?? null,
    tbValidUntil: animalData.tb_valid_until ?? null,
    tbStatus: animalData.tb_status ?? null,
    brLastDate: animalData.br_date ?? null,
    brResult: animalData.br_result ?? null,
    brValidUntil: animalData.br_valid_until ?? null,
    brStatus: animalData.br_status ?? null,
    uppId: animalData.upp_id,
    uppName: animalData.upp_name ?? null,
    uppCode: animalData.upp_code ?? null,
    motherAnimalId: animalData.mother_animal_id ?? null,
    tests,
    vaccinations,
    incidents,
  };

  return apiSuccess({ animal });
}
