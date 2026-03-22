import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ServerAdminProductorDetailRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductorDetailRepository";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface UpdateProducerDocumentBody {
  documentId?: string;
  status?: "pending" | "validated" | "expired" | "rejected";
  comments?: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerAdminProductorDetailRepository();

  try {
    const documents = await repository.getDocuments(id);
    return apiSuccess({ documents });
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCER_DOCS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar documentos.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UpdateProducerDocumentBody;
  try {
    body = (await request.json()) as UpdateProducerDocumentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { id: producerId } = await params;
  const documentId = body.documentId?.trim();
  if (!documentId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar documentId.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status !== undefined) {
    updatePayload.status = body.status;
  }
  if (body.comments !== undefined) {
    const normalizedComments = typeof body.comments === "string" ? body.comments.trim() : body.comments;
    updatePayload.comments = normalizedComments || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("producer_documents")
    .update(updatePayload)
    .eq("producer_id", producerId)
    .eq("id", documentId)
    .select("id,status,comments,is_current,expiry_date,uploaded_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_PRODUCER_DOCUMENT_UPDATE_FAILED", updateResult.error.message, 400);
  }
  if (!updateResult.data) {
    return apiError("ADMIN_PRODUCER_DOCUMENT_NOT_FOUND", "No existe documento con ese id para el productor.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "status_change",
    resource: "admin.producers.documents",
    resourceId: documentId,
    payload: {
      producerId,
      ...updatePayload,
    },
  });

  return apiSuccess({ document: updateResult.data });
}
