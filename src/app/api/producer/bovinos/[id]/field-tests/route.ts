import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdminClient();

  // Verify ownership via animals table
  const animalCheck = await supabaseAdmin
    .from("animals")
    .select("id,upp_id,tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (animalCheck.error || !animalCheck.data) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }

  const animal = animalCheck.data as { id: string; upp_id: string; tenant_id: string };

  const canAccess = await auth.context.canAccessUpp(animal.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  const result = await supabaseAdmin
    .from("field_tests")
    .select(
      "id,animal_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at,test_types(key,name),mvz_profiles(full_name)"
    )
    .eq("animal_id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .order("sample_date", { ascending: false });

  if (result.error) {
    return apiError("FIELD_TESTS_QUERY_FAILED", result.error.message, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldTests = (result.data ?? []).map((row: any) => ({
    id: row.id,
    animal_id: row.animal_id,
    test_type_key: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.key ?? "—",
    test_type_name: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.name ?? "—",
    sample_date: row.sample_date,
    result: row.result,
    valid_until: row.valid_until,
    mvz_name: (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
    captured_lat: row.captured_lat,
    captured_lng: row.captured_lng,
    created_at: row.created_at,
  }));

  return apiSuccess({ fieldTests });
}
