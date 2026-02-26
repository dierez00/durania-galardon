import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.tests",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ tests: [] });
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const testsResult = await supabase
    .from("field_tests")
    .select("id,animal_id,upp_id,test_type_id,sample_date,result,valid_until,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (testsResult.error) {
    return apiError("PRODUCER_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  const tests = testsResult.data ?? [];
  const animalIds = [...new Set(tests.map((row) => row.animal_id))];
  const testTypeIds = [...new Set(tests.map((row) => row.test_type_id))];

  const [animalsResult, typesResult] = await Promise.all([
    animalIds.length > 0
      ? supabase.from("animals").select("id,siniiga_tag,status").eq("tenant_id", auth.context.user.tenantId).in("id", animalIds)
      : Promise.resolve({ data: [], error: null }),
    testTypeIds.length > 0
      ? supabase.from("test_types").select("id,key,name").in("id", testTypeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (animalsResult.error || typesResult.error) {
    return apiError("PRODUCER_TESTS_JOIN_QUERY_FAILED", "No fue posible enriquecer historial de pruebas.", 500, {
      animals: animalsResult.error?.message,
      types: typesResult.error?.message,
    });
  }

  const animalById = new Map((animalsResult.data ?? []).map((animal) => [animal.id, animal]));
  const typeById = new Map((typesResult.data ?? []).map((type) => [type.id, type]));

  return apiSuccess({
    tests: tests.map((row) => ({
      ...row,
      animal: animalById.get(row.animal_id) ?? null,
      testType: typeById.get(row.test_type_id) ?? null,
    })),
  });
}
