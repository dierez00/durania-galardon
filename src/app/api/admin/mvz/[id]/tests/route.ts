import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabaseAdmin = getSupabaseProvisioningClient();

  type TestRow = {
    id: string;
    sample_date: string;
    result: string;
    created_at: string;
    animals: { siniiga_tag: string } | null;
    test_types: { name: string } | null;
  };

  const testsResult = await supabaseAdmin
    .from("field_tests")
    .select(
      "id,sample_date,result,created_at,animals(siniiga_tag),test_types(name)",
      { count: "exact" }
    )
    .eq("mvz_profile_id", id)
    .order("created_at", { ascending: false });

  if (testsResult.error) {
    return apiError("ADMIN_MVZ_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  const tests = ((testsResult.data as unknown as TestRow[]) ?? []).map((t) => ({
    id: t.id,
    animalTag: t.animals?.siniiga_tag ?? "—",
    testTypeName: t.test_types?.name ?? "—",
    sampleDate: t.sample_date,
    result: t.result,
    createdAt: t.created_at,
  }));

  return apiSuccess({ tests });
}
