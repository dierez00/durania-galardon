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

  // Validate the export exists and the animal is part of it
  const exportResult = await supabase
    .from("export_requests")
    .select("metrics_json")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (exportResult.error) {
    return apiError("ADMIN_EXPORT_QUERY_FAILED", exportResult.error.message, 500);
  }
  if (!exportResult.data) {
    return apiError("ADMIN_EXPORT_NOT_FOUND", "No existe la solicitud de exportación.", 404);
  }

  const metrics = exportResult.data.metrics_json as { animal_ids?: string[] } | null;
  const animalIds = metrics?.animal_ids ?? [];
  if (!animalIds.includes(animalId)) {
    return apiError("ANIMAL_NOT_IN_EXPORT", "El animal no pertenece a esta exportación.", 404);
  }

  const adminClient = getSupabaseProvisioningClient();

  // Fetch animal with UPP details
  const animalResult = await adminClient
    .from("animals")
    .select(`
      id, siniiga_tag, sex, birth_date, status, mother_animal_id,
      upps(id, name)
    `)
    .eq("id", animalId)
    .maybeSingle();

  if (animalResult.error) {
    return apiError("ADMIN_ANIMAL_QUERY_FAILED", animalResult.error.message, 500);
  }
  if (!animalResult.data) {
    return apiError("ADMIN_ANIMAL_NOT_FOUND", "No existe el animal.", 404);
  }

  // Fetch full test history
  const testsResult = await adminClient
    .from("field_tests")
    .select(`
      id, sample_date, result, valid_until, created_at,
      test_types(key, name),
      mvz_profiles(full_name)
    `)
    .eq("animal_id", animalId)
    .order("sample_date", { ascending: false });

  if (testsResult.error) {
    return apiError("ADMIN_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  const animalData = animalResult.data;
  const uppData = (animalData as Record<string, unknown> & { upps?: { id?: string; name?: string } | null }).upps;

  const tests = (testsResult.data ?? []).map((t) => {
    const tt = t.test_types as { key?: string; name?: string } | null;
    const mvz = t.mvz_profiles as { full_name?: string } | null;
    return {
      id: t.id,
      testTypeKey: tt?.key ?? "unknown",
      testTypeName: tt?.name ?? null,
      sampleDate: t.sample_date,
      result: t.result,
      validUntil: t.valid_until ?? null,
      mvzFullName: mvz?.full_name ?? null,
    };
  });

  const animal = {
    id: animalData.id,
    siniigaTag: animalData.siniiga_tag,
    sex: animalData.sex,
    birthDate: animalData.birth_date ?? null,
    status: animalData.status,
    motherAnimalId: animalData.mother_animal_id ?? null,
    uppId: uppData?.id ?? null,
    uppName: uppData?.name ?? null,
    tests,
  };

  return apiSuccess({ animal });
}
