import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { createHash } from "crypto";
import { logAuditEvent } from "@/server/audit";

const BUCKET = "Documents_producer";

// GET - List UPP documents
export async function GET(request: NextRequest) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.read"],
    resource: "producer.documents",
  });
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdminClient();

  // Get accessible UPP IDs
  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ documents: [] });
  }

  const result = await supabaseAdmin
    .from("upp_documents")
    .select("*")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("uploaded_at", { ascending: false });

  if (result.error) {
    return apiError("UPP_DOCUMENTS_QUERY_FAILED", result.error.message, 500);
  }

  return apiSuccess({ documents: result.data ?? [] });
}

// POST - Upload UPP document
export async function POST(request: NextRequest) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.write"],
    resource: "producer.documents",
  });
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const uppId = formData.get("uppId")?.toString().trim();
  const documentType = formData.get("documentType")?.toString().trim();
  const expiryDate = formData.get("expiryDate")?.toString().trim();
  const providedHash = formData.get("fileHash")?.toString().trim();

  if (!file || !uppId || !documentType) {
    return apiError("INVALID_PAYLOAD", "Debe enviar file, uppId y documentType.");
  }

  // Verify UPP access
  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  // Calculate hash
  const calculatedHash = await calculateFileHash(file);
  if (providedHash && providedHash !== calculatedHash) {
    return apiError("HASH_MISMATCH", "El hash proporcionado no coincide con el archivo.");
  }

  // Storage path: Documents_producer/[tenant_id]/upp/[upp_id]/[document_type]/[timestamp]_[filename]
  const timestamp = Date.now();
  const fileStorageKey = `${auth.context.user.tenantId}/upp/${uppId}/${documentType}/${timestamp}_${file.name}`;

  try {
    // Upload to storage
    const supabaseAdmin = getSupabaseAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileStorageKey, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      return apiError("UPLOAD_FAILED", uploadError.message);
    }

    // Deactivate previous documents of same type
    await supabaseAdmin
      .from("upp_documents")
      .update({ is_current: false })
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("upp_id", uppId)
      .eq("document_type", documentType)
      .eq("is_current", true);

    // Insert new document
    const insertResult = await supabaseAdmin
      .from("upp_documents")
      .insert({
        tenant_id: auth.context.user.tenantId,
        upp_id: uppId,
        document_type: documentType,
        file_storage_key: fileStorageKey,
        file_hash: calculatedHash,
        status: "pending",
        is_current: true,
        expiry_date: expiryDate || null,
        uploaded_by_user_id: auth.context.user.id,
      })
      .select()
      .single();

    if (insertResult.error) {
      return apiError("INSERT_FAILED", insertResult.error.message, 500);
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.upp_documents",
      resourceId: insertResult.data.id,
      payload: { uppId, documentType },
    });

    return apiSuccess({ document: insertResult.data }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError("UPLOAD_FAILED", error.message);
    }
    return apiError("UPLOAD_FAILED", "Error desconocido al subir el archivo.");
  }
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
