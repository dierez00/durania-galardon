import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient, getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";
import { UPP_EXPORTACION_DOCUMENT_TYPES } from "@/modules/producer/documents/domain/entities/UppDocumentEntity";
import {
  buildExportValidationResult,
  type ExportAnimalSnapshot,
  type ExportDocumentSnapshot,
  type ExportTestSnapshot,
} from "@/modules/exportaciones/domain/services/validateExportRequest";
import {
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

interface ProducerExportBody {
  uppId?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.exports.read"],
    resource: "producer.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  logProducerAccessServer("producer/exports:get:start", {
    userId: auth.context.user.id,
    role: auth.context.user.role,
    tenantId: auth.context.user.tenantId,
    tenantSlug: auth.context.user.tenantSlug,
    panelType: auth.context.user.panelType,
  });

  const uppId = new URL(request.url).searchParams.get("uppId")?.trim() ?? null;
  if (uppId) {
    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
    }
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const scopedUppIds = uppId ? accessibleUppIds.filter((accessibleUppId) => accessibleUppId === uppId) : accessibleUppIds;
  logProducerAccessServer("producer/exports:get:accessible-ids", {
    userId: auth.context.user.id,
    tenantId: auth.context.user.tenantId,
    accessibleUpps: sampleProducerAccessIds(scopedUppIds),
  });
  if (scopedUppIds.length === 0) {
    logProducerAccessServer("producer/exports:get:empty-access", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
    });
    return apiSuccess({ exports: [] });
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const rowsResult = await supabase
    .from("export_requests")
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,monthly_bucket,created_at,updated_at"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", scopedUppIds)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    logProducerAccessServer("producer/exports:get:error", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      error: summarizeProducerAccessError(rowsResult.error),
    });
    return apiError("PRODUCER_EXPORTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  logProducerAccessServer("producer/exports:get:end", {
    userId: auth.context.user.id,
    tenantId: auth.context.user.tenantId,
    exportsCount: rowsResult.data?.length ?? 0,
  });

  return apiSuccess({ exports: rowsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.exports.write"],
    resource: "producer.exports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerExportBody;
  try {
    body = (await request.json()) as ProducerExportBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  if (!uppId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const producerId = await resolveProducerId(auth.context.user);

  const supabaseAdmin = getSupabaseAdminClient();
  const exportThresholdSettingResult = await supabaseAdmin
    .from("normative_settings")
    .select("value_json,effective_from")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("key", "export_60_rule_pct")
    .eq("status", "active")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exportThresholdSettingResult.error) {
    return apiError("EXPORT_THRESHOLD_QUERY_FAILED", exportThresholdSettingResult.error.message, 500);
  }

  const configuredThreshold =
    Number(
      (exportThresholdSettingResult.data?.value_json as { pct?: number } | null)?.pct ??
        60
    ) || 60;

  const animalsResult = await supabaseAdmin
    .from("animals")
    .select("id,sex,status,siniiga_tag")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("upp_id", uppId);

  if (animalsResult.error) {
    return apiError("EXPORT_ANIMALS_QUERY_FAILED", animalsResult.error.message, 500);
  }

  const animalSnapshots: ExportAnimalSnapshot[] = (animalsResult.data ?? []).map((animal) => ({
    id: animal.id,
    sex: animal.sex,
    status: animal.status,
    siniigaTag: animal.siniiga_tag,
  }));

  const activeAnimalIds = animalSnapshots.filter((animal) => animal.status === "active").map((animal) => animal.id);

  if (activeAnimalIds.length === 0) {
    return apiError(
      "EXPORT_VALIDATION_FAILED",
      "No hay inventario activo en la UPP para iniciar una exportación.",
      422,
      { reasons: ["No hay animales activos en la UPP."] }
    );
  }

  const testsResult = await supabaseAdmin
    .from("field_tests")
    .select("animal_id,result,valid_until,sample_date,test_types(key)")
    .in("animal_id", activeAnimalIds)
    .order("sample_date", { ascending: false });

  if (testsResult.error) {
    return apiError("EXPORT_TESTS_QUERY_FAILED", testsResult.error.message, 500);
  }

  const latestTestsByAnimalAndType = new Map<string, Set<string>>();
  const testSnapshots: ExportTestSnapshot[] = [];
  for (const row of testsResult.data ?? []) {
    const testType = (row.test_types as { key?: string } | null)?.key ?? "";
    if (!testType) {
      continue;
    }

    if (!latestTestsByAnimalAndType.has(row.animal_id)) {
      latestTestsByAnimalAndType.set(row.animal_id, new Set<string>());
    }

    const consumedTypes = latestTestsByAnimalAndType.get(row.animal_id);
    if (!consumedTypes || consumedTypes.has(testType)) {
      continue;
    }

    consumedTypes.add(testType);
    testSnapshots.push({
      animalId: row.animal_id,
      testType,
      result: row.result ?? null,
      validUntil: row.valid_until ?? null,
    });
  }

  const quarantineResult = await supabaseAdmin
    .from("state_quarantines")
    .select("id,quarantine_type,status")
    .eq("upp_id", uppId)
    .eq("status", "active");

  if (quarantineResult.error) {
    return apiError("EXPORT_QUARANTINE_QUERY_FAILED", quarantineResult.error.message, 500);
  }

  const hasDefinitiveQuarantine = (quarantineResult.data ?? []).some(
    (row) => (row.quarantine_type ?? "").toLowerCase() === "definitive"
  );

  const requiredDocumentTypes = UPP_EXPORTACION_DOCUMENT_TYPES.map((documentType) => documentType.key);
  const uppDocumentsResult = await supabaseAdmin
    .from("upp_documents")
    .select("document_type,status,expiry_date")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("upp_id", uppId)
    .eq("is_current", true)
    .in("document_type", requiredDocumentTypes);

  if (uppDocumentsResult.error) {
    return apiError("EXPORT_DOCUMENTS_QUERY_FAILED", uppDocumentsResult.error.message, 500);
  }

  const documentSnapshots: ExportDocumentSnapshot[] = (uppDocumentsResult.data ?? []).map((document) => ({
    documentType: document.document_type,
    status: document.status,
    expiryDate: document.expiry_date,
  }));

  const validationResult = buildExportValidationResult({
    animals: animalSnapshots,
    tests: testSnapshots,
    documents: documentSnapshots,
    hasDefinitiveQuarantine,
    thresholdPct: configuredThreshold,
  });

  if (!validationResult.passed) {
    return apiError(
      "EXPORT_VALIDATION_FAILED",
      "La solicitud no cumple los criterios obligatorios de exportación.",
      422,
      {
        reasons: validationResult.reasons,
        rule60: validationResult.rule60,
        pillars: validationResult.pillars,
      }
    );
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const createResult = await supabase
    .from("export_requests")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: producerId,
      upp_id: uppId,
      requested_by_user_id: auth.context.user.id,
      status: "requested",
      monthly_bucket: new Date().toISOString().slice(0, 10),
      compliance_60_rule: validationResult.rule60.passed,
      tb_br_validated: validationResult.pillars.invalidAnimalIds.length === 0,
      blue_tag_assigned: true,
      metrics_json: {
        threshold_pct: validationResult.rule60.thresholdPct,
        total_animals_upp: validationResult.rule60.totalActiveAnimals,
        male_animals_upp: validationResult.rule60.maleActiveAnimals,
        male_pct_upp: validationResult.rule60.malePct,
        animal_ids: activeAnimalIds,
        pillars: {
          quarantine: !validationResult.pillars.hasDefinitiveQuarantine,
          sanitary: validationResult.pillars.invalidAnimalIds.length === 0,
          documents: validationResult.pillars.missingDocuments.length === 0,
          documents_not_expired: validationResult.pillars.expiredDocuments.length === 0,
          identity_siniiga: true,
        },
        documents: {
          required: requiredDocumentTypes,
          missing: validationResult.pillars.missingDocuments,
          expired: validationResult.pillars.expiredDocuments,
        },
      },
    })
    .select(
      "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,blocked_reason,monthly_bucket,created_at,updated_at"
    )
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "PRODUCER_EXPORT_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear solicitud de exportacion.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.exports",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      status: createResult.data.status,
    },
  });

  return apiSuccess({ exportRequest: createResult.data }, { status: 201 });
}
