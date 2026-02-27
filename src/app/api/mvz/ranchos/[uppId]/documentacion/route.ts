import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/app/api/mvz/ranchos/_utils";

interface DocumentBody {
  documentType?: string;
  fileStorageKey?: string;
  fileHash?: string;
  status?: "pending" | "validated" | "expired" | "rejected";
  issuedAt?: string;
  expiryDate?: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.documents.read",
    "mvz.ranch.documents"
  );
  if (!access.ok) {
    return access.response;
  }

  const rowsResult = await access.supabase
    .from("upp_documents")
    .select(
      "id,tenant_id,upp_id,document_type,file_storage_key,file_hash,status,issued_at,expiry_date,uploaded_by_user_id,is_current,uploaded_at,updated_at"
    )
    .eq("upp_id", uppId)
    .order("uploaded_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_RANCH_DOCUMENTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ documents: rowsResult.data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.documents.write",
    "mvz.ranch.documents"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: DocumentBody;
  try {
    body = (await request.json()) as DocumentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const documentType = body.documentType?.trim();
  const fileStorageKey = body.fileStorageKey?.trim();
  const fileHash = body.fileHash?.trim();

  if (!documentType || !fileStorageKey || !fileHash) {
    return apiError("INVALID_PAYLOAD", "Debe enviar documentType, fileStorageKey y fileHash.");
  }

  const currentResult = await access.supabase
    .from("upp_documents")
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq("upp_id", uppId)
    .eq("document_type", documentType)
    .eq("is_current", true);

  if (currentResult.error) {
    return apiError("MVZ_RANCH_DOCUMENTS_PREPARE_FAILED", currentResult.error.message, 400);
  }

  const insertResult = await access.supabase
    .from("upp_documents")
    .insert({
      tenant_id: access.upp.tenant_id,
      upp_id: uppId,
      document_type: documentType,
      file_storage_key: fileStorageKey,
      file_hash: fileHash,
      status: body.status ?? "pending",
      issued_at: body.issuedAt ?? null,
      expiry_date: body.expiryDate ?? null,
      uploaded_by_user_id: access.context.user.id,
      is_current: true,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id,tenant_id,upp_id,document_type,file_storage_key,file_hash,status,issued_at,expiry_date,uploaded_by_user_id,is_current,uploaded_at,updated_at"
    )
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "MVZ_RANCH_DOCUMENT_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar documento.",
      400
    );
  }

  return apiSuccess({ document: insertResult.data }, { status: 201 });
}


