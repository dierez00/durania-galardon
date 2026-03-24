import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/modules/ranchos/infra/api/mvzRanchAccess";
import { documentDeletionPolicy } from "@/modules/producer/documents/domain/services/documentDeletionPolicy";
import { ServerUppDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerUppDocumentsRepository";

interface DocumentUpdateBody {
  documentType?: string;
  fileStorageKey?: string;
  fileHash?: string;
  status?: "pending" | "validated" | "expired" | "rejected";
  issuedAt?: string;
  expiryDate?: string;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uppId: string; id: string }> }
) {
  const { uppId, id } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.documents.write",
    "mvz.ranch.documents"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: DocumentUpdateBody;
  try {
    body = (await request.json()) as DocumentUpdateBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.documentType !== undefined) {
    const documentType = body.documentType.trim();
    if (!documentType) {
      return apiError("INVALID_PAYLOAD", "documentType no puede ser vacio.");
    }
    updatePayload.document_type = documentType;
  }
  if (body.fileStorageKey !== undefined) {
    const fileStorageKey = body.fileStorageKey.trim();
    if (!fileStorageKey) {
      return apiError("INVALID_PAYLOAD", "fileStorageKey no puede ser vacio.");
    }
    updatePayload.file_storage_key = fileStorageKey;
  }
  if (body.fileHash !== undefined) {
    const fileHash = body.fileHash.trim();
    if (!fileHash) {
      return apiError("INVALID_PAYLOAD", "fileHash no puede ser vacio.");
    }
    updatePayload.file_hash = fileHash;
  }
  if (body.status !== undefined) {
    updatePayload.status = body.status;
  }
  if (body.issuedAt !== undefined) {
    updatePayload.issued_at = body.issuedAt || null;
  }
  if (body.expiryDate !== undefined) {
    updatePayload.expiry_date = body.expiryDate || null;
  }

  const updateResult = await access.supabaseAdmin
    .from("upp_documents")
    .update(updatePayload)
    .eq("id", id)
    .eq("upp_id", uppId)
    .select(
      "id,tenant_id,upp_id,document_type,file_storage_key,file_hash,status,issued_at,expiry_date,uploaded_by_user_id,is_current,uploaded_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_RANCH_DOCUMENT_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_RANCH_DOCUMENT_NOT_FOUND", "No existe documento para la UPP enviada.", 404);
  }

  return apiSuccess({ document: updateResult.data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uppId: string; id: string }> }
) {
  const { uppId, id } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.documents.write",
    "mvz.ranch.documents"
  );
  if (!access.ok) {
    return access.response;
  }

  const docResult = await access.supabaseAdmin
    .from("upp_documents")
    .select("id, upp_id, document_type, file_storage_key, is_current, status, tenant_id")
    .eq("id", id)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (docResult.error || !docResult.data) {
    return apiError("MVZ_RANCH_DOCUMENT_NOT_FOUND", "Documento no encontrado.", 404);
  }

  const otherVersionsResult = await access.supabaseAdmin
    .from("upp_documents")
    .select("id")
    .eq("tenant_id", access.context.user.tenantId)
    .eq("upp_id", uppId)
    .eq("document_type", docResult.data.document_type)
    .neq("id", id)
    .limit(1);

  if (otherVersionsResult.error) {
    return apiError("DELETE_VALIDATION_FAILED", otherVersionsResult.error.message, 500);
  }

  const hasOtherVersion = (otherVersionsResult.data?.length ?? 0) > 0;
  if (
    !documentDeletionPolicy.canDelete({
      isCurrent: docResult.data.is_current,
      status: docResult.data.status,
      hasOtherVersion,
    })
  ) {
    return apiError(
      "DELETION_BLOCKED",
      documentDeletionPolicy.getDeletionBlockedReason({
        isCurrent: docResult.data.is_current,
        status: docResult.data.status,
        hasOtherVersion,
      }),
      400
    );
  }

  const repository = new ServerUppDocumentsRepository(
    access.context.user.tenantId,
    access.context.user.id,
    [uppId]
  );

  try {
    await repository.delete(id);
  } catch (error) {
    return apiError(
      "DELETE_FAILED",
      error instanceof Error ? error.message : "Error desconocido al eliminar documento.",
      500
    );
  }

  return apiSuccess({ deletedId: id });
}
