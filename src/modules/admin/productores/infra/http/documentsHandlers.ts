import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ServerAdminProductorDetailRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductorDetailRepository";
import { logAuditEvent } from "@/server/audit";
import type { AdminDocumentSourceType } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import { ReviewAdminProductorDocumentUseCase } from "@/modules/admin/productores/application/use-cases/ReviewAdminProductorDocument";
import {
  AdminDocumentReviewValidationError,
} from "@/modules/admin/productores/domain/services/adminDocumentReviewPolicy";

interface ReviewDocumentBody {
  sourceType?: AdminDocumentSourceType;
  documentId?: string;
  status?: "validated" | "expired" | "rejected" | "pending";
  comments?: string | null;
  expiryDate?: string | null;
}

function isValidSourceType(value: string | null): value is AdminDocumentSourceType {
  return value === "producer" || value === "upp";
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
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const sourceTypeParam = url.searchParams.get("sourceType");
  const documentIdParam = url.searchParams.get("documentId")?.trim();

  if (view === "detail") {
    if (!isValidSourceType(sourceTypeParam)) {
      return apiError("INVALID_QUERY", "Debe enviar sourceType valido (producer|upp).", 400);
    }
    if (!documentIdParam) {
      return apiError("INVALID_QUERY", "Debe enviar documentId para solicitar detalle.", 400);
    }

    try {
      const document = await repository.getDocumentDetail(id, sourceTypeParam, documentIdParam);
      if (!document) {
        return apiError("ADMIN_PRODUCER_DOCUMENT_NOT_FOUND", "No existe documento para ese productor.", 404);
      }
      return apiSuccess({ document });
    } catch (error) {
      return apiError(
        "ADMIN_PRODUCER_DOCUMENT_DETAIL_FAILED",
        error instanceof Error ? error.message : "No fue posible cargar el detalle del documento.",
        500
      );
    }
  }

  if (view === "file") {
    if (!isValidSourceType(sourceTypeParam)) {
      return apiError("INVALID_QUERY", "Debe enviar sourceType valido (producer|upp).", 400);
    }
    if (!documentIdParam) {
      return apiError("INVALID_QUERY", "Debe enviar documentId para solicitar archivo.", 400);
    }

    try {
      const signedUrl = await repository.getDocumentSignedUrl(id, sourceTypeParam, documentIdParam);
      if (!signedUrl) {
        return apiError("ADMIN_PRODUCER_DOCUMENT_NOT_FOUND", "No existe documento para ese productor.", 404);
      }
      return apiSuccess({ url: signedUrl });
    } catch (error) {
      return apiError(
        "ADMIN_PRODUCER_DOCUMENT_SIGNED_URL_FAILED",
        error instanceof Error ? error.message : "No fue posible generar URL firmada.",
        500
      );
    }
  }

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

  let body: ReviewDocumentBody;
  try {
    body = (await request.json()) as ReviewDocumentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { id: producerId } = await params;
  const documentId = body.documentId?.trim();
  const sourceType = body.sourceType;

  if (!sourceType || !isValidSourceType(sourceType)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar sourceType valido (producer|upp).", 400);
  }
  if (!documentId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar documentId.");
  }
  if (!body.status) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status.", 400);
  }

  const repository = new ServerAdminProductorDetailRepository();
  const useCase = new ReviewAdminProductorDocumentUseCase(repository);

  const previous = await repository.getDocumentDetail(producerId, sourceType, documentId);
  if (!previous) {
    return apiError("ADMIN_PRODUCER_DOCUMENT_NOT_FOUND", "No existe documento con ese id para el productor.", 404);
  }

  try {
    await useCase.execute(producerId, {
      documentId,
      sourceType,
      status: body.status,
      comments: body.comments,
      expiryDate: body.expiryDate,
    });
  } catch (error) {
    if (error instanceof AdminDocumentReviewValidationError) {
      return apiError("INVALID_PAYLOAD", error.message, 400);
    }
    return apiError(
      "ADMIN_PRODUCER_DOCUMENT_UPDATE_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar el documento.",
      400
    );
  }

  const updated = await repository.getDocumentDetail(producerId, sourceType, documentId);
  if (!updated) {
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
      sourceType,
      before: {
        status: previous.status,
        comments: previous.comments,
        expiryDate: previous.expiryDate,
      },
      after: {
        status: updated.status,
        comments: updated.comments,
        expiryDate: updated.expiryDate,
      },
    },
  });

  return apiSuccess({ document: updated });
}
