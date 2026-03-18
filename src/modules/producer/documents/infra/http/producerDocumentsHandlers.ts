import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { ServerProducerDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerProducerDocumentsRepository";
import {
  calculateFileHash,
  findProducerIdForUserOrTenant,
} from "@/modules/producer/documents/infra/supabase/shared";

interface ProducerDocumentBody {
  id?: string;
  expiryDate?: string;
  status?: "pending" | "validated" | "expired" | "rejected";
  isCurrent?: boolean;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.read"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const repository = new ServerProducerDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id
  );

  try {
    const documents = await repository.list();
    return apiSuccess({
      documents: documents.map((document) => ({
        id: document.id,
        tenant_id: document.tenantId,
        producer_id: document.producerId,
        document_type_id: document.documentTypeId,
        file_storage_key: document.fileStorageKey,
        file_hash: document.fileHash,
        uploaded_at: document.uploadedAt,
        status: document.status,
        is_current: document.isCurrent,
        expiry_date: document.expiryDate,
        ocr_confidence: document.ocrConfidence,
        document_type: {
          key: document.documentTypeKey,
          name: document.documentTypeName,
        },
      })),
    });
  } catch (error) {
    return apiError(
      "PRODUCER_DOCUMENTS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar documentos.",
      500
    );
  }
}

export async function POST(request: Request) {
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
  const documentTypeKey = formData.get("documentTypeKey")?.toString().trim();
  const expiryDate = formData.get("expiryDate")?.toString().trim();

  if (!file || !documentTypeKey) {
    return apiError("INVALID_PAYLOAD", "Debe enviar un archivo y documentTypeKey.");
  }

  const providedHash = formData.get("fileHash")?.toString().trim();
  if (providedHash) {
    const calculatedHash = await calculateFileHash(file);
    if (providedHash !== calculatedHash) {
      return apiError("HASH_MISMATCH", "El hash proporcionado no coincide con el archivo subido.");
    }
  }

  const repository = new ServerProducerDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id
  );

  try {
    const document = await repository.upload(file, documentTypeKey, expiryDate);

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.documents",
      resourceId: document.id,
      payload: {
        producerId: document.producerId,
        documentTypeId: document.documentTypeId,
      },
    });

    return apiSuccess(
      {
        document: {
          id: document.id,
          tenant_id: document.tenantId,
          producer_id: document.producerId,
          document_type_id: document.documentTypeId,
          file_storage_key: document.fileStorageKey,
          file_hash: document.fileHash,
          uploaded_at: document.uploadedAt,
          status: document.status,
          is_current: document.isCurrent,
          expiry_date: document.expiryDate,
          document_type: {
            key: document.documentTypeKey,
            name: document.documentTypeName,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(
      "UPLOAD_FAILED",
      error instanceof Error ? error.message : "Error desconocido al subir el archivo."
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.write"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerDocumentBody;
  try {
    body = (await request.json()) as ProducerDocumentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id del documento.");
  }

  const producerId = await findProducerIdForUserOrTenant(auth.context.user.tenantId, auth.context.user.id);
  if (!producerId) {
    return apiError("PRODUCER_NOT_FOUND", "No existe perfil productor asociado.", 404);
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.expiryDate !== undefined) {
    updatePayload.expiry_date = body.expiryDate || null;
  }
  if (body.isCurrent !== undefined) {
    updatePayload.is_current = body.isCurrent;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("producer_documents")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("producer_id", producerId)
    .eq("id", id)
    .select(
      "id,tenant_id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date,ocr_confidence"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("PRODUCER_DOCUMENT_UPDATE_FAILED", updateResult.error.message, 400);
  }
  if (!updateResult.data) {
    return apiError("PRODUCER_DOCUMENT_NOT_FOUND", "No existe documento con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "producer.documents",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ document: updateResult.data });
}
