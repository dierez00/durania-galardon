import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { documentDeletionPolicy } from "@/modules/producer/documents/domain/services/documentDeletionPolicy";
import { ServerProducerDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerProducerDocumentsRepository";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.write"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const docResult = await supabaseAdmin
    .from("producer_documents")
    .select("id, producer_id, document_type_id, file_storage_key, is_current, status, tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (docResult.error || !docResult.data) {
    return apiError("NOT_FOUND", "Documento no encontrado.", 404);
  }

  const document = docResult.data;
  const otherVersionsResult = await supabaseAdmin
    .from("producer_documents")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("producer_id", document.producer_id)
    .eq("document_type_id", document.document_type_id)
    .neq("id", id)
    .limit(1);

  if (otherVersionsResult.error) {
    return apiError("DELETE_VALIDATION_FAILED", otherVersionsResult.error.message, 500);
  }

  const hasOtherVersion = (otherVersionsResult.data?.length ?? 0) > 0;
  if (
    !documentDeletionPolicy.canDelete({
      isCurrent: document.is_current,
      status: document.status,
      hasOtherVersion,
    })
  ) {
    return apiError(
      "DELETION_BLOCKED",
      documentDeletionPolicy.getDeletionBlockedReason({
        isCurrent: document.is_current,
        status: document.status,
        hasOtherVersion,
      }),
      400
    );
  }

  const repository = new ServerProducerDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id
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

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "producer.documents",
    resourceId: id,
    payload: {
      producerId: document.producer_id,
      fileStorageKey: document.file_storage_key,
    },
  });

  return apiSuccess({
    message: "Documento eliminado exitosamente",
    deletedId: id,
  });
}
