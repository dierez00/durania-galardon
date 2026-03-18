import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";
import { ServerUppDocumentsRepository } from "@/modules/producer/documents/infra/supabase/ServerUppDocumentsRepository";
import { calculateFileHash } from "@/modules/producer/documents/infra/supabase/shared";

export async function GET(request: NextRequest) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.read"],
    resource: "producer.documents",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const repository = new ServerUppDocumentsRepository(
    auth.context.user.tenantId,
    auth.context.user.id,
    accessibleUppIds
  );

  try {
    const documents = await repository.list();
    return apiSuccess({ documents });
  } catch (error) {
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
    const document = await repository.upload(file, uppId, documentType, expiryDate);

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.upp_documents",
      resourceId: document.id,
      payload: { uppId, documentType },
    });

    return apiSuccess({ document }, { status: 201 });
  } catch (error) {
    return apiError(
      "UPLOAD_FAILED",
      error instanceof Error ? error.message : "Error desconocido al subir el archivo."
    );
  }
}
