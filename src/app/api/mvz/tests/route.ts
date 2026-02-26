import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface MvzTestBody {
  animalId?: string;
  uppId?: string;
  testTypeKey?: string;
  sampleDate?: string;
  result?: "negative" | "positive" | "inconclusive";
  validUntil?: string;
  capturedLat?: number;
  capturedLng?: number;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.tests.read"],
    resource: "mvz.tests",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const uppId = url.searchParams.get("uppId")?.trim();
  const accessibleUppIds = uppId ? [uppId] : await auth.context.getAccessibleUppIds();

  if (uppId) {
    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
    }
  }

  if (accessibleUppIds.length === 0) {
    return apiSuccess({ tests: [] });
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const testsResult = await supabase
    .from("field_tests")
    .select("id,animal_id,upp_id,mvz_profile_id,test_type_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at")
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (testsResult.error) {
    return apiError("MVZ_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  return apiSuccess({ tests: testsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.tests.write"],
    resource: "mvz.tests",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzTestBody;
  try {
    body = (await request.json()) as MvzTestBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const animalId = body.animalId?.trim();
  const uppId = body.uppId?.trim();
  const testTypeKey = body.testTypeKey?.trim().toLowerCase();
  const sampleDate = body.sampleDate;
  const result = body.result;

  if (!animalId || !uppId || !testTypeKey || !sampleDate || !result) {
    return apiError("INVALID_PAYLOAD", "Debe enviar animalId, uppId, testTypeKey, sampleDate y result.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const supabaseAdmin = getSupabaseAdminClient();
  const testTypeResult = await supabase
    .from("test_types")
    .select("id")
    .eq("key", testTypeKey)
    .maybeSingle();

  if (testTypeResult.error || !testTypeResult.data) {
    return apiError("TEST_TYPE_NOT_FOUND", "No existe test_type para el key enviado.", 404);
  }

  const uppResult = await supabaseAdmin
    .from("upps")
    .select("tenant_id")
    .eq("id", uppId)
    .maybeSingle();

  if (uppResult.error || !uppResult.data) {
    return apiError("UPP_NOT_FOUND", "No existe UPP para registrar la prueba.", 404);
  }

  const insertResult = await supabaseAdmin
    .from("field_tests")
    .insert({
      tenant_id: uppResult.data.tenant_id,
      animal_id: animalId,
      upp_id: uppId,
      mvz_profile_id: mvzProfileId,
      test_type_id: testTypeResult.data.id,
      sample_date: sampleDate,
      result,
      valid_until: body.validUntil ?? null,
      captured_lat: body.capturedLat ?? null,
      captured_lng: body.capturedLng ?? null,
    })
    .select("id,animal_id,upp_id,mvz_profile_id,test_type_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at")
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "MVZ_TEST_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar prueba sanitaria.",
      400
    );
  }

  if (result === "positive") {
    await supabase
      .from("animals")
      .update({ status: "blocked" })
      .eq("id", animalId);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "mvz.tests",
    resourceId: insertResult.data.id,
    payload: {
      animalId,
      uppId,
      testTypeKey,
      result,
      reactorBlocked: result === "positive",
    },
  });

  return apiSuccess({ test: insertResult.data }, { status: 201 });
}
