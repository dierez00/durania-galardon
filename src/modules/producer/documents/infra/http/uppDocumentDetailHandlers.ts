import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { documentDeletionPolicy } from "@/modules/producer/documents/domain/services/documentDeletionPolicy";
import { ServerUppDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerUppDocumentsRepository";

export async function PATCH(
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

  let body: { status?: string; comments?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  if (!body.status) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status.");
  }
  if (body.comments !== undefined) {
    return apiError("FORBIDDEN", "Solo gobierno/admin puede actualizar comentarios de documentos.", 403);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const docResult = await supabaseAdmin
    .from("upp_documents")
    .select("upp_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (docResult.error || !docResult.data) {
    return apiError("NOT_FOUND", "Documento no encontrado.", 404);
  }

  const canAccess = await auth.context.canAccessUpp(docResult.data.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este documento.", 403);
  }

  const updateResult = await supabaseAdmin
    .from("upp_documents")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .single();

  if (updateResult.error) {
    return apiError("UPDATE_FAILED", updateResult.error.message, 500);
  }

  return apiSuccess({ document: updateResult.data });
}

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
    .from("upp_documents")
    .select("id, upp_id, document_type, file_storage_key, is_current, status, tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (docResult.error || !docResult.data) {
    return apiError("NOT_FOUND", "Documento no encontrado.", 404);
  }

  const document = docResult.data;
  const canAccess = await auth.context.canAccessUpp(document.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este documento.", 403);
  }

  const otherVersionsResult = await supabaseAdmin
    .from("upp_documents")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("upp_id", document.upp_id)
    .eq("document_type", document.document_type)
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

  const repository = new ServerUppDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id,
    [document.upp_id]
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
    resource: "producer.upp_documents",
    resourceId: id,
    payload: {
      uppId: document.upp_id,
      fileStorageKey: document.file_storage_key,
    },
  });

  return apiSuccess({
    message: "Documento eliminado exitosamente",
    deletedId: id,
  });
}
