import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient, getSupabaseProvisioningClient } from "@/server/auth/supabase";

type SanitaryAlert = "ok" | "por_vencer" | "prueba_vencida" | "sin_pruebas" | "positivo" | "inactivo";

interface LatestTestInfo {
  lastDate: string | null;
  result: string | null;
  validUntil: string | null;
  status: "ok" | "por_vencer" | "prueba_vencida" | "sin_pruebas";
}

function computeTestStatus(validUntil: string | null, result: string | null): LatestTestInfo["status"] {
  if (!validUntil) return "sin_pruebas";
  const today = new Date();
  const expiry = new Date(validUntil);
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
  if (daysUntilExpiry < 0) return "prueba_vencida";
  if (daysUntilExpiry <= 30) return "por_vencer";
  if (result?.toLowerCase() === "positivo") return "ok"; // positive handled separately
  return "ok";
}

function computeSanitaryAlert(
  animal: { status: string },
  tbInfo: LatestTestInfo,
  brInfo: LatestTestInfo
): SanitaryAlert {
  if (animal.status !== "active") return "inactivo";
  if (tbInfo.result?.toLowerCase() === "positivo" || brInfo.result?.toLowerCase() === "positivo") return "positivo";
  if (tbInfo.status === "prueba_vencida" || brInfo.status === "prueba_vencida") return "prueba_vencida";
  if (tbInfo.status === "sin_pruebas" && brInfo.status === "sin_pruebas") return "sin_pruebas";
  if (tbInfo.status === "por_vencer" || brInfo.status === "por_vencer") return "por_vencer";
  return "ok";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.read"],
    resource: "admin.exports",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.context.user.tenantId;
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  // Fetch the export to get metrics_json.animal_ids
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

  if (animalIds.length === 0) {
    return apiSuccess({ animals: [] });
  }

  // Use provisioning client for cross-tenant animal reads
  const adminClient = getSupabaseProvisioningClient();

  // Fetch animals
  const animalsResult = await adminClient
    .from("animals")
    .select("id,siniiga_tag,sex,birth_date,status,upp_id")
    .in("id", animalIds);

  if (animalsResult.error) {
    return apiError("ADMIN_ANIMALS_QUERY_FAILED", animalsResult.error.message, 500);
  }

  const animals = animalsResult.data ?? [];

  // Fetch latest field_tests per animal and per test type
  const testsResult = await adminClient
    .from("field_tests")
    .select(`
      id, animal_id, sample_date, result, valid_until,
      test_types(key)
    `)
    .in("animal_id", animalIds)
    .order("sample_date", { ascending: false });

  if (testsResult.error) {
    return apiError("ADMIN_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  const allTests = testsResult.data ?? [];

  // Group latest test per animal per test_type key
  const latestByAnimalAndType = new Map<string, Map<string, typeof allTests[0]>>();
  for (const test of allTests) {
    const typeKey = (test.test_types as { key?: string } | null)?.key ?? "unknown";
    const key = test.animal_id;
    if (!latestByAnimalAndType.has(key)) latestByAnimalAndType.set(key, new Map());
    const byType = latestByAnimalAndType.get(key) ?? new Map<string, typeof allTests[0]>();
    if (!byType.has(typeKey)) byType.set(typeKey, test); // already ordered desc, first is latest
  }

  const result = animals.map((a) => {
    const byType = latestByAnimalAndType.get(a.id) ?? new Map();
    const tbTest = byType.get("tb") ?? null;
    const brTest = byType.get("br") ?? null;

    const emptyTest: LatestTestInfo = { lastDate: null, result: null, validUntil: null, status: "sin_pruebas" };

    const tbInfo: LatestTestInfo = tbTest
      ? {
          lastDate: tbTest.sample_date,
          result: tbTest.result,
          validUntil: tbTest.valid_until ?? null,
          status: computeTestStatus(tbTest.valid_until ?? null, tbTest.result),
        }
      : emptyTest;

    const brInfo: LatestTestInfo = brTest
      ? {
          lastDate: brTest.sample_date,
          result: brTest.result,
          validUntil: brTest.valid_until ?? null,
          status: computeTestStatus(brTest.valid_until ?? null, brTest.result),
        }
      : emptyTest;

    return {
      id: a.id,
      siniigaTag: a.siniiga_tag,
      sex: a.sex,
      birthDate: a.birth_date ?? null,
      status: a.status,
      sanitaryAlert: computeSanitaryAlert(a, tbInfo, brInfo),
      tbLastDate: tbInfo.lastDate,
      tbResult: tbInfo.result,
      tbValidUntil: tbInfo.validUntil,
      tbStatus: tbInfo.status,
      brLastDate: brInfo.lastDate,
      brResult: brInfo.result,
      brValidUntil: brInfo.validUntil,
      brStatus: brInfo.status,
    };
  });

  return apiSuccess({ animals: result });
}
