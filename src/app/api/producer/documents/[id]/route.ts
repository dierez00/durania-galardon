import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { documentDeletionPolicy } from "@/modules/producer/documents/domain/services/documentDeletionPolicy";

const SUPABASE_BUCKET = "Documents_producer";

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
  if (!auth.ok) return auth.response;

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

  if (!documentDeletionPolicy.canDelete({
    isCurrent: document.is_current,
    status: document.status,
    hasOtherVersion,
  })) {
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

  try {
    const { error: storageError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .remove([document.file_storage_key]);

    if (storageError) {
      console.error("Error eliminando archivo de Storage:", storageError);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("producer_documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return apiError("DELETE_FAILED", deleteError.message, 500);
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError("DELETE_FAILED", error.message, 500);
    }
    return apiError("DELETE_FAILED", "Error desconocido al eliminar documento.", 500);
  }
}
