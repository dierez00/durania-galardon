import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { createHash } from "crypto";

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

const SUPABASE_BUCKET = "Documents_producer";

// Mapa estático de tipos de documento personales del productor.
// Es la fuente de verdad para auto-crear entradas en document_types si no existen.
const PERSONAL_DOCUMENT_TYPE_META: Record<string, { name: string; requiresExpiry: boolean }> = {
  ine: { name: "INE", requiresExpiry: true },
  curp: { name: "CURP", requiresExpiry: false },
  comprobante_domicilio: { name: "Comprobante de Domicilio", requiresExpiry: true },
};

async function uploadFileToSupabase(file: File, filePath: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }

  return data.path;
}

async function calculateFileHash(file: File): Promise<string> {
  const hash = createHash("sha256");
  const reader = file.stream().getReader();
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) hash.update(value);
    done = readerDone;
  }

  return `sha256:${hash.digest("hex")}`;
}

async function ensureBucketExists(bucketName: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

  if (listError) {
    throw new Error(`Error al listar buckets: ${listError.message}`);
  }

  const exists = buckets.some(
    (b) => b.name === bucketName || b.name.toLowerCase() === bucketName.toLowerCase()
  );

  if (!exists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: false,
    });
    if (createError) {
      throw new Error(`Error al crear bucket '${bucketName}': ${createError.message}`);
    }
  }
}

async function findProducerIdForUserOrTenant(tenantId: string, userId: string): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  // Prefer explicit mapping of user -> producer profile (owner)
  const byUser = await supabaseAdmin
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (byUser.data?.id) return byUser.data.id;

  // Fallback: tenant has exactly one producer row; allow employees to act on it
  const byTenant = await supabaseAdmin
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", tenantId)
    .maybeSingle();

  if (byTenant.error) {
    throw new Error(byTenant.error.message);
  }

  return byTenant.data?.id ?? null;
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

  const producerId = await findProducerIdForUserOrTenant(auth.context.user.tenantId, auth.context.user.id);
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

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const documentTypeKey = formData.get("documentTypeKey")?.toString().trim();
  const expiryDate = formData.get("expiryDate")?.toString().trim();

  if (!file || !documentTypeKey) {
    return apiError("INVALID_PAYLOAD", "Debe enviar un archivo y documentTypeKey.");
  }

  try {
    await ensureBucketExists(SUPABASE_BUCKET);

    const calculatedHash = await calculateFileHash(file);

    const providedHash = formData.get("fileHash")?.toString().trim();
    if (providedHash && providedHash !== calculatedHash) {
      return apiError("HASH_MISMATCH", "El hash proporcionado no coincide con el archivo subido.");
    }

    // Use admin client to bypass RLS issues when resolving the producer profile
    const supabaseAdmin = getSupabaseAdminClient();
    const producerId = await findProducerIdForUserOrTenant(auth.context.user.tenantId, auth.context.user.id);

    if (!producerId) {
      return apiError(
        "PRODUCER_NOT_FOUND",
        `No existe perfil productor para tenant=${auth.context.user.tenantId}.`,
        404
      );
    }

    const normalizedKey = documentTypeKey.toLowerCase();
    const typeMeta = PERSONAL_DOCUMENT_TYPE_META[normalizedKey];
    if (!typeMeta) {
      return apiError("INVALID_DOCUMENT_TYPE", "Tipo de documento no reconocido.", 400);
    }

    // Upsert garantiza que el tipo exista aunque no haya sido sembrado en la BD
    const typeUpsertResult = await supabaseAdmin
      .from("document_types")
      .upsert(
        { key: normalizedKey, name: typeMeta.name, requires_expiry: typeMeta.requiresExpiry },
        { onConflict: "key", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (typeUpsertResult.error || !typeUpsertResult.data) {
      return apiError("DOCUMENT_TYPE_UPSERT_FAILED", typeUpsertResult.error?.message ?? "No se pudo resolver el tipo de documento.", 500);
    }

    const documentTypeId = typeUpsertResult.data.id;

    // Storage path: Documents_producer/[tenant_id]/personal/[producer_id]/[document_type]/[timestamp]_[filename]
    const timestamp = Date.now();
    const fileStorageKey = `${auth.context.user.tenantId}/personal/${producerId}/${normalizedKey}/${timestamp}_${file.name}`;

    await uploadFileToSupabase(file, fileStorageKey);

    // Deactivate previous current document of the same type before inserting
    await supabaseAdmin
      .from("producer_documents")
      .update({ is_current: false })
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("producer_id", producerId)
      .eq("document_type_id", documentTypeId)
      .eq("is_current", true);

    const insertResult = await supabaseAdmin
      .from("producer_documents")
      .insert({
        tenant_id: auth.context.user.tenantId,
        producer_id: producerId,
        document_type_id: documentTypeId,
        file_storage_key: fileStorageKey,
        file_hash: calculatedHash,
        status: "pending",
        is_current: true,
        expiry_date: expiryDate || null,
      })
      .select("id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date,document_type:document_types(key,name)")
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError("UPLOAD_FAILED", error.message);
    }
    return apiError("UPLOAD_FAILED", "Error desconocido al subir el archivo.");
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
