import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";
import type { OfflineSyncItem } from "@/shared/lib/auth";

interface SyncBody {
  items?: OfflineSyncItem[];
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.tests.sync"],
    resource: "mvz.tests.sync",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const items = body.items ?? [];
  if (items.length === 0) {
    return apiSuccess({ synced: [], skipped: [] });
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para sincronizar.", 403);
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const synced: Array<{ clientMutationId: string; fieldTestId: string }> = [];
  const skipped: Array<{ clientMutationId: string; reason: string }> = [];

  for (const item of items) {
    const clientMutationId = item.clientMutationId?.trim();
    const uppId = item.uppId?.trim();
    const animalId = item.animalId?.trim();
    const testTypeKey = item.testTypeKey?.trim().toLowerCase();

    if (!clientMutationId || !uppId || !animalId || !testTypeKey || !item.sampleDate || !item.result) {
      skipped.push({ clientMutationId: clientMutationId ?? "missing", reason: "INVALID_ITEM" });
      continue;
    }

    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      skipped.push({ clientMutationId, reason: "UPP_FORBIDDEN" });
      continue;
    }

    const existingSync = await supabase
      .from("field_test_sync_events")
      .select("field_test_id")
      .eq("mvz_user_id", auth.context.user.id)
      .eq("client_mutation_id", clientMutationId)
      .maybeSingle();

    if (!existingSync.error && existingSync.data?.field_test_id) {
      synced.push({ clientMutationId, fieldTestId: existingSync.data.field_test_id });
      continue;
    }

    const testTypeResult = await supabase
      .from("test_types")
      .select("id")
      .eq("key", testTypeKey)
      .maybeSingle();

    if (testTypeResult.error || !testTypeResult.data) {
      skipped.push({ clientMutationId, reason: "TEST_TYPE_NOT_FOUND" });
      continue;
    }

<<<<<<< Updated upstream
    const uppResult = await supabaseAdmin
      .from("upps")
      .select("tenant_id")
      .eq("id", uppId)
      .maybeSingle();

    if (uppResult.error || !uppResult.data) {
      skipped.push({ clientMutationId, reason: "UPP_NOT_FOUND" });
      continue;
    }

    const targetTenantId = uppResult.data.tenant_id;

    const insertFieldTest = await supabaseAdmin
=======
    const insertFieldTest = await supabase
>>>>>>> Stashed changes
      .from("field_tests")
      .insert({
        tenant_id: targetTenantId,
        animal_id: animalId,
        upp_id: uppId,
        mvz_profile_id: mvzProfileId,
        test_type_id: testTypeResult.data.id,
        sample_date: item.sampleDate,
        result: item.result,
        valid_until: item.validUntil ?? null,
        captured_lat: item.capturedLat ?? null,
        captured_lng: item.capturedLng ?? null,
      })
      .select("id")
      .single();

    if (insertFieldTest.error || !insertFieldTest.data) {
      skipped.push({ clientMutationId, reason: "FIELD_TEST_INSERT_FAILED" });
      continue;
    }

    if (item.result === "positive") {
      await supabase
        .from("animals")
        .update({ status: "blocked" })
        .eq("id", animalId);
    }

<<<<<<< Updated upstream
    const syncInsert = await supabaseAdmin.from("field_test_sync_events").insert({
      tenant_id: targetTenantId,
=======
    const syncInsert = await supabase.from("field_test_sync_events").insert({
      tenant_id: auth.context.user.tenantId,
>>>>>>> Stashed changes
      mvz_user_id: auth.context.user.id,
      client_mutation_id: clientMutationId,
      field_test_id: insertFieldTest.data.id,
      payload_json: item,
    });

    if (syncInsert.error) {
      skipped.push({ clientMutationId, reason: "SYNC_EVENT_INSERT_FAILED" });
      continue;
    }

    synced.push({ clientMutationId, fieldTestId: insertFieldTest.data.id });
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "sync",
    resource: "mvz.tests.sync",
    payload: {
      total: items.length,
      synced: synced.length,
      skipped: skipped.length,
    },
  });

  return apiSuccess({ synced, skipped });
}
