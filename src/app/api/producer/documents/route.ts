import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface ProducerDocumentBody {
  id?: string;
  documentTypeId?: string;
  documentTypeKey?: string;
  fileStorageKey?: string;
  fileHash?: string;
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

  const producerId = await resolveProducerId(auth.context.user);
  if (!producerId) {
    return apiSuccess({ documents: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rowsResult = await supabaseAdmin
    .from("producer_documents")
    .select(
      "id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date,ocr_confidence,ocr_validated_at,document_type:document_types(key,name)"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("producer_id", producerId)
    .order("uploaded_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("PRODUCER_DOCUMENTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ documents: rowsResult.data ?? [] });
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

  let body: ProducerDocumentBody;
  try {
    body = (await request.json()) as ProducerDocumentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const fileStorageKey = body.fileStorageKey?.trim();
  const fileHash = body.fileHash?.trim();
  if (!fileStorageKey || !fileHash) {
    return apiError("INVALID_PAYLOAD", "Debe enviar fileStorageKey y fileHash.");
  }

  const producerId = await resolveProducerId(auth.context.user);
  if (!producerId) {
    return apiError("PRODUCER_NOT_FOUND", "No existe perfil productor asociado.", 404);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  let documentTypeId = body.documentTypeId?.trim() || null;

  if (!documentTypeId && body.documentTypeKey?.trim()) {
    const typeByKey = await supabaseAdmin
      .from("document_types")
      .select("id")
      .eq("key", body.documentTypeKey.trim().toLowerCase())
      .maybeSingle();

    if (typeByKey.error || !typeByKey.data) {
      return apiError("DOCUMENT_TYPE_NOT_FOUND", "No existe tipo de documento para ese key.", 404);
    }

    documentTypeId = typeByKey.data.id;
  }

  if (!documentTypeId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar documentTypeId o documentTypeKey.");
  }

  const insertResult = await supabaseAdmin
    .from("producer_documents")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: producerId,
      document_type_id: documentTypeId,
      file_storage_key: fileStorageKey,
      file_hash: fileHash,
      status: "pending",
      is_current: true,
      expiry_date: body.expiryDate ?? null,
    })
    .select("id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date")
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "PRODUCER_DOCUMENT_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar documento.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.documents",
    resourceId: insertResult.data.id,
    payload: {
      producerId,
      documentTypeId,
    },
  });

  return apiSuccess({ document: insertResult.data }, { status: 201 });
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

  const producerId = await resolveProducerId(auth.context.user);
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
    .select("id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date")
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
