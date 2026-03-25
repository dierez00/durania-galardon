import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";
import { ServerUppDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerUppDocumentsRepository";
import { calculateFileHash } from "@/modules/producer/documents/infra/supabase/shared";
import { processUppDocumentOcrInBackground } from "@/modules/producer/documents/infra/ocr/processDocumentOcr";
import {
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

export async function GET(request: NextRequest) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.read"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  logProducerAccessServer("producer/upp-documents:get:start", {
    userId: auth.context.user.id,
    role: auth.context.user.role,
    tenantId: auth.context.user.tenantId,
    tenantSlug: auth.context.user.tenantSlug,
    panelType: auth.context.user.panelType,
  });

  const uppId = request.nextUrl.searchParams.get("uppId")?.trim();
  if (!uppId) {
    return apiError("INVALID_PAYLOAD", "Debe proporcionar el parámetro 'uppId'.", 400);
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const scopedUppIds = accessibleUppIds.filter((accessibleUppId) => accessibleUppId === uppId);
  logProducerAccessServer("producer/upp-documents:get:accessible-ids", {
    userId: auth.context.user.id,
    tenantId: auth.context.user.tenantId,
    accessibleUpps: sampleProducerAccessIds(scopedUppIds),
  });
  if (scopedUppIds.length === 0) {
    logProducerAccessServer("producer/upp-documents:get:empty-access", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
    });
  }

  const repository = new ServerUppDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id,
    scopedUppIds
  );

  try {
    const documents = await repository.list();
    logProducerAccessServer("producer/upp-documents:get:end", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      documentsCount: documents.length,
    });
    return apiSuccess({
      documents: documents.map((document) => ({
        id: document.id,
        tenant_id: document.tenantId,
        upp_id: document.uppId,
        document_type: document.documentType,
        file_storage_key: document.fileStorageKey,
        file_hash: document.fileHash,
        status: document.status,
        comments: document.comments,
        is_current: document.isCurrent,
        issued_at: document.issuedAt,
        expiry_date: document.expiryDate,
        uploaded_at: document.uploadedAt,
        full_text: document.fullText,
        ocr_text: document.ocrText,
        ocr_fields: document.ocrFields,
        ocr_metadata: document.ocrMetadata,
      })),
    });
  } catch (error) {
    logProducerAccessServer("producer/upp-documents:get:error", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      error: summarizeProducerAccessError(error),
    });
    return apiError(
      "UPP_DOCUMENTS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar documentos de UPP.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.write"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const uppId = formData.get("uppId")?.toString().trim();
  const documentType = formData.get("documentType")?.toString().trim();
  const expiryDate = formData.get("expiryDate")?.toString().trim();
  const providedHash = formData.get("fileHash")?.toString().trim();
  const bovinoId = formData.get("bovinoId")?.toString().trim();

  if (!file || !uppId || !documentType) {
    return apiError("INVALID_PAYLOAD", "Debe enviar file, uppId y documentType.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  if (providedHash) {
    const calculatedHash = await calculateFileHash(file);
    if (providedHash !== calculatedHash) {
      return apiError("HASH_MISMATCH", "El hash proporcionado no coincide con el archivo.");
    }
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const repository = new ServerUppDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id,
    accessibleUppIds
  );

  try {
    const document = await repository.upload(file, uppId, documentType, expiryDate, bovinoId);

    void processUppDocumentOcrInBackground({
      documentId: document.id,
      file,
      documentType,
      source: "upload",
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.upp_documents",
      resourceId: document.id,
      payload: { uppId, documentType, bovinoId: bovinoId || null },
    });

    return apiSuccess({ document }, { status: 201 });
  } catch (error) {
    return apiError(
      "UPLOAD_FAILED",
      error instanceof Error ? error.message : "Error desconocido al subir el archivo."
    );
  }
}
